import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ProjectHeader } from '@/components/project/project-header'
import { ProjectStats } from '@/components/project/project-stats'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, Circle, ArrowRight, ArrowLeft, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import { userCanManageProjectMembers } from '@/lib/permissions/project-members-permissions'
import type { ProjectStatus } from '@/types'
import { computePhaseProgressPercent } from '@/lib/projects/compute-phase-progress'
import { isPhaseCompleteForGating, isPhaseLockedByGating } from '@/lib/projects/phase-gating'
import {
  phaseTimelineCardClass,
  phaseTimelineProgressBarClass,
  phaseTimelineStatusTextClass,
} from '@/lib/theme/phase-timeline-classes'

const sdlcBadgeColors = {
  Scrum: 'bg-blue-100 text-blue-700 border-blue-200',
  Kanban: 'bg-orange-100 text-orange-700 border-orange-200',
  Waterfall: 'bg-purple-100 text-purple-700 border-purple-200',
  DevOps: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Hybrid: 'bg-green-100 text-green-700 border-green-200',
};

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const tenantSlug = getTenantSlug()
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const orgId = tenantSlug
    ? (
        await supabase
          .from('organizations')
          .select('id')
          .eq('slug', tenantSlug)
          .maybeSingle()
      ).data?.id ?? null
    : await resolvePrimaryOrgIdForUser(supabase as any, user.id)

  if (!orgId) redirect('/onboarding')

  // `phase_gating_enabled` was introduced in `migrations/add_phase_gating.sql`.
  // If the column doesn't exist yet, PostgREST returns PGRST204, causing `project` to be null.
  // Retry without the column so the page doesn't 404.
  let project:
    | {
        id: string
        name: string
        description: string | null
        status: string
        progress_percent: number | null
        phase_gating_enabled?: boolean | null
      due_date?: string | null
      }
    | null = null

  {
    const attempt = await supabase
      .from('projects')
      .select('id,name,description,status,progress_percent,phase_gating_enabled,due_date')
      .eq('id', params.id)
      .eq('organization_id', orgId)
      .maybeSingle()

    if (attempt.error?.code === 'PGRST204') {
      const fallbackWithDueDate = await supabase
        .from('projects')
        .select('id,name,description,status,progress_percent,due_date')
        .eq('id', params.id)
        .eq('organization_id', orgId)
        .maybeSingle()

      if (fallbackWithDueDate.error?.code === 'PGRST204') {
        const fallback = await supabase
          .from('projects')
          .select('id,name,description,status,progress_percent')
          .eq('id', params.id)
          .eq('organization_id', orgId)
          .maybeSingle()

        project = fallback.data as any
      } else {
        project = fallbackWithDueDate.data as any
      }
    } else {
      project = attempt.data as any
    }
  }

  if (!project) notFound()
  const projectDueDate = project.due_date ? new Date(project.due_date) : null

  let teamMemberCount = 0
  {
    const { count, error: memberCountError } = await supabase
      .from('project_members')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project.id)
      .eq('organization_id', orgId)

    if (!memberCountError && typeof count === 'number') {
      teamMemberCount = count
    }
  }

  // `is_gated` was introduced in `migrations/add_phase_gating.sql`.
  // Retry without it if needed.
  let phases:
    | {
        id: string
        title: string
        methodology: 'scrum' | 'kanban' | 'waterfall' | 'devops'
        status: string
        order_index: number
        is_gated?: boolean | null
      }[]
    | null = null

  {
    const attempt = await supabase
      .from('sdlc_phases')
      .select('id,title,methodology,status,order_index,is_gated')
      .eq('project_id', project.id)
      .order('order_index', { ascending: true })

    if (attempt.error?.code === 'PGRST204') {
      const fallback = await supabase
        .from('sdlc_phases')
        .select('id,title,methodology,status,order_index')
        .eq('project_id', project.id)
        .order('order_index', { ascending: true })
      phases = fallback.data as any
    } else {
      phases = attempt.data as any
    }
  }

  // Per-phase and project progress: % of tasks done (completed_at or is_done stage).
  // Done semantics match the phase page: completed_at OR stage marked is_done.
  const phaseIdsForProgress = (phases ?? []).map((phase) => phase.id)
  const { data: workflowStagesForProgress } =
    phaseIdsForProgress.length > 0
      ? await supabase
          .from('workflow_stages')
          .select('id,phase_id,is_done')
          .eq('organization_id', orgId)
          .in('phase_id', phaseIdsForProgress)
      : { data: [] as any[] }

  const stageIdToPhaseId = new Map<string, string>()
  const doneStageIds = new Set<string>()
  for (const s of (workflowStagesForProgress ?? []) as { id: string; phase_id: string; is_done: boolean }[]) {
    stageIdToPhaseId.set(s.id, s.phase_id)
    if (s.is_done) doneStageIds.add(s.id)
  }

  const stageIdsForProgress = Array.from(stageIdToPhaseId.keys())
  const { data: tasksForProgress } =
    stageIdsForProgress.length > 0
      ? await supabase
          .from('tasks')
          .select('workflow_stage_id,completed_at,process_id')
          .eq('organization_id', orgId)
          .eq('project_id', project.id)
          .in('workflow_stage_id', stageIdsForProgress)
      : { data: [] as any[] }

  const phaseTotals = new Map<string, { total: number; done: number }>()
  for (const pid of phaseIdsForProgress) phaseTotals.set(pid, { total: 0, done: 0 })
  const progressTasks = (tasksForProgress ?? []) as {
    workflow_stage_id: string
    completed_at: string | null
    process_id: string | null
  }[]

  for (const t of progressTasks) {
    const pid = stageIdToPhaseId.get(t.workflow_stage_id)
    if (!pid) continue
    const agg = phaseTotals.get(pid) ?? { total: 0, done: 0 }
    agg.total += 1
    if (t.completed_at || doneStageIds.has(t.workflow_stage_id)) agg.done += 1
    phaseTotals.set(pid, agg)
  }

  let tasksCount = 0
  let completedTasks = 0
  for (const agg of phaseTotals.values()) {
    tasksCount += agg.total
    completedTasks += agg.done
  }
  const projectProgress =
    project.status === 'completed'
      ? 100
      : tasksCount > 0
        ? Math.min(100, Math.max(0, Math.round((completedTasks / tasksCount) * 100)))
        : (project.progress_percent ?? 0)

  let phaseProcesses:
    | {
        id: string
        phase_id: string
        name: string
        methodology: 'scrum' | 'kanban' | 'waterfall' | 'devops'
        order_index: number
      }[]
    | null = null

  {
    const phaseIds = (phases ?? []).map((phase) => phase.id)
    if (phaseIds.length === 0) {
      phaseProcesses = []
    } else {
      const attempt = await supabase
        .from('phase_processes')
        .select('id,phase_id,name,methodology,order_index')
        .in('phase_id', phaseIds)
        .order('order_index', { ascending: true })

      if (attempt.error?.code === 'PGRST204') {
        phaseProcesses = []
      } else {
        phaseProcesses = (attempt.data as any[]) ?? []
      }
    }
  }

  const mappedPhases = (phases ?? []).map((p) => {
    const processes = (phaseProcesses ?? [])
      .filter((process) => process.phase_id === p.id)
      .map((process) => ({
        id: process.id,
        name: process.name,
        methodology: process.methodology,
      }))
    const fallbackMethod =
      p.methodology === 'scrum'
        ? 'Scrum'
        : p.methodology === 'kanban'
          ? 'Kanban'
          : p.methodology === 'waterfall'
            ? 'Waterfall'
            : p.methodology === 'devops'
              ? 'DevOps'
              : 'Hybrid'
    const methodSet = new Set(processes.map((process) => process.methodology))
    const sdlcType =
      methodSet.size > 1
        ? 'Hybrid'
        : methodSet.has('scrum')
          ? 'Scrum'
          : methodSet.has('kanban')
            ? 'Kanban'
            : methodSet.has('waterfall')
              ? 'Waterfall'
              : methodSet.has('devops')
                ? 'DevOps'
                : fallbackMethod

    return {
      id: p.id,
      name: p.title,
      sdlcType,
      dbStatus: p.status as 'active' | 'completed' | 'archived',
      isGated: !!p.is_gated,
      processes,
      progress: computePhaseProgressPercent({
        phaseId: p.id,
        phaseStatus: p.status,
        tasks: progressTasks,
        stageIdToPhaseId,
        doneStageIds,
      }),
    }
  })

  const phaseGatingSnapshots = mappedPhases.map((p) => ({
    id: p.id,
    status: p.dbStatus,
    isGated: p.isGated,
    progress: p.progress,
  }))

  const canManageProjectTeam = await userCanManageProjectMembers(supabase, {
    organizationId: orgId,
    userId: user.id,
    projectId: project.id,
  })

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link 
        href="/dashboard/projects"
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Projects
      </Link>

      <ProjectHeader
        organizationId={orgId}
        canManageProjectTeam={canManageProjectTeam}
        project={{
          id: project.id,
          name: project.name,
          description: project.description ?? '',
          // MVP: treat project-level methodology as a display label; hybrid is modeled per-phase.
          sdlcMethodology: 'kanban',
          status: project.status as ProjectStatus,
          progress: projectProgress,
          tasksCount,
          completedTasks,
          dueDate: projectDueDate,
          teamMembers: teamMemberCount,
        }}
      />
      <ProjectStats
        project={{
          id: project.id,
          name: project.name,
          description: project.description ?? '',
          sdlcMethodology: 'kanban',
          status: project.status as ProjectStatus,
          progress: projectProgress,
          tasksCount,
          completedTasks,
          dueDate: projectDueDate,
          teamMembers: teamMemberCount,
        }}
      />

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Project Phases Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {mappedPhases.map((phase, index) => {
              const locked = isPhaseLockedByGating(
                index,
                phaseGatingSnapshots,
                !!project.phase_gating_enabled
              )
              // Timeline status must match progress % (see isPhaseCompleteForGating).
              const isCompleted = isPhaseCompleteForGating(phaseGatingSnapshots[index]!)
              const isInProgress = !locked && !isCompleted
              const statusLabel = locked ? 'Locked' : isCompleted ? 'Completed' : 'Active'
              const progress = locked ? 0 : phase.progress
              const timelineState = isCompleted ? 'completed' : isInProgress ? 'active' : 'locked'
              const statusTextColor = phaseTimelineStatusTextClass(timelineState, locked)
              const progressColor = phaseTimelineProgressBarClass(timelineState, locked)
              const StatusIcon = isCompleted ? CheckCircle2 : isInProgress ? Clock : Circle

              return (
                <div
                  key={phase.id}
                  className={`${phaseTimelineCardClass(timelineState, locked)} ${locked ? 'cursor-not-allowed opacity-70' : 'hover:shadow-md hover:border-primary/50'}`}
                >
                  {!locked ? (
                    <Link
                      href={`/dashboard/projects/${project.id}/phases/${phase.id}`}
                      className="absolute inset-0 rounded-lg z-10"
                      aria-label={`Open phase ${phase.name}`}
                    />
                  ) : null}
                  <div className="relative z-20 pointer-events-none flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-1">
                      <StatusIcon className={`h-5 w-5 flex-shrink-0 ${statusTextColor}`} />
                      <h3 className="phase-timeline-card__title font-semibold text-sm text-foreground line-clamp-1">{phase.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {locked && (
                        <span className="phase-timeline-locked-badge inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-card border border-border px-2 py-1 rounded">
                          <Lock className="h-3 w-3" />
                          Locked
                        </span>
                      )}
                      <Badge 
                        variant="outline" 
                        className={`${sdlcBadgeColors[phase.sdlcType as keyof typeof sdlcBadgeColors]} text-xs font-medium`}
                      >
                        {phase.sdlcType}
                      </Badge>
                    </div>
                  </div>

                  <div className={`relative z-20 pointer-events-none text-xs font-medium mb-3 ${statusTextColor}`}>
                    {statusLabel}
                  </div>

                  <div className="relative z-20 mb-3 space-y-1">
                    <p className="phase-timeline-card__label text-[11px] uppercase tracking-wide text-muted-foreground pointer-events-none">Processes</p>
                    {phase.processes.length > 0 ? (
                      <div className={`flex flex-wrap gap-1 ${locked ? 'pointer-events-none' : 'pointer-events-auto'}`}>
                        {phase.processes.map((process, processIndex) => (
                          <Link
                            key={process.id ?? `${process.name}-${processIndex}`}
                            href={
                              process.methodology === 'scrum'
                                ? `/dashboard/projects/${project.id}/phases/${phase.id}/processes/${process.id}/sprints`
                                : `/dashboard/projects/${project.id}/phases/${phase.id}/processes/${process.id}/board`
                            }
                            className="phase-timeline-process-chip inline-flex items-center rounded border border-border bg-card px-2 py-0.5 text-[11px] text-foreground"
                          >
                            {process.name} ({process.methodology})
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground pointer-events-none">No processes configured yet.</p>
                    )}
                  </div>

                  <div className="relative z-20 pointer-events-none space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="phase-timeline-card__label">Progress</span>
                      <span className="phase-timeline-card__progress-value font-semibold text-foreground">{progress}%</span>
                    </div>
                    <div className="phase-timeline-card__track w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${progressColor}`} 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {!locked && (
                    <ArrowRight className="absolute right-3 bottom-3 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
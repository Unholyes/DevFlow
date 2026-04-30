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
import type { ProjectStatus } from '@/types'

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

  let phaseProcesses:
    | {
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
        .select('phase_id,name,methodology,order_index')
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
    }
  })

  const isPhaseLocked = (phaseIndex: number) => {
    if (!project.phase_gating_enabled) return false
    const phase = mappedPhases?.[phaseIndex]
    if (!phase?.isGated) return false
    if (phaseIndex === 0) return false
    const prev = mappedPhases?.[phaseIndex - 1]
    return prev?.dbStatus !== 'completed'
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link 
        href="/dashboard/projects"
        className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Projects
      </Link>

      <ProjectHeader
        project={{
          id: project.id,
          name: project.name,
          description: project.description ?? '',
          // MVP: treat project-level methodology as a display label; hybrid is modeled per-phase.
          sdlcMethodology: 'kanban',
          status: project.status as ProjectStatus,
          progress: project.progress_percent ?? 0,
          tasksCount: 0,
          completedTasks: 0,
          dueDate: projectDueDate,
          teamMembers: 0,
        }}
      />
      <ProjectStats
        project={{
          id: project.id,
          name: project.name,
          description: project.description ?? '',
          sdlcMethodology: 'kanban',
          status: project.status as ProjectStatus,
          progress: project.progress_percent ?? 0,
          tasksCount: 0,
          completedTasks: 0,
          dueDate: projectDueDate,
          teamMembers: 0,
        }}
      />

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900">Project Phases Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {mappedPhases.map((phase, index) => {
              const locked = isPhaseLocked(index)
              const isCompleted = phase.dbStatus === 'completed'
              const isInProgress = !locked && !isCompleted
              const statusLabel = locked ? 'Locked' : isCompleted ? 'Completed' : 'Active'
              const progress = isCompleted ? 100 : locked ? 0 : 50

              const statusBg = isCompleted 
                ? 'bg-green-50 border-green-200' 
                : isInProgress 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-gray-50 border-gray-200';
              
              const statusTextColor = isCompleted 
                ? 'text-green-700' 
                : isInProgress 
                  ? 'text-blue-700' 
                  : 'text-gray-500';
              
              const progressColor = isCompleted 
                ? 'bg-green-500' 
                : isInProgress 
                  ? 'bg-blue-600' 
                  : 'bg-gray-300';

              const StatusIcon = isCompleted ? CheckCircle2 : isInProgress ? Clock : Circle;

              return (
                <div
                  key={phase.id}
                  className={`group relative p-4 rounded-lg border-2 transition-all ${locked ? 'cursor-not-allowed opacity-70' : 'hover:shadow-md hover:border-blue-300'} ${statusBg}`}
                >
                  {!locked ? (
                    <Link
                      href={`/dashboard/projects/${project.id}/phases/${phase.id}`}
                      className="absolute inset-0 rounded-lg"
                      aria-label={`Open phase ${phase.name}`}
                    />
                  ) : null}
                  <div className="relative z-10 flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-1">
                      <StatusIcon className={`h-5 w-5 flex-shrink-0 ${statusTextColor}`} />
                      <h3 className="font-semibold text-sm text-gray-900 line-clamp-1">{phase.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {locked && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 px-2 py-1 rounded">
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

                  <div className={`relative z-10 text-xs font-medium mb-3 ${statusTextColor}`}>
                    {statusLabel}
                  </div>

                  <div className="relative z-10 mb-3 space-y-1">
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">Processes</p>
                    {phase.processes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {phase.processes.map((process, processIndex) => (
                          <Link
                            key={`${process.name}-${processIndex}`}
                            href={
                              process.methodology === 'scrum'
                                ? `/dashboard/projects/${project.id}/phases/${phase.id}/sprints?process=${encodeURIComponent(process.name)}&method=${encodeURIComponent(process.methodology)}`
                                : `/dashboard/projects/${project.id}/phases/${phase.id}/board?process=${encodeURIComponent(process.name)}&method=${encodeURIComponent(process.methodology)}`
                            }
                            className="inline-flex items-center rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700"
                          >
                            {process.name} ({process.methodology})
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">No processes configured yet.</p>
                    )}
                  </div>

                  <div className="relative z-10 space-y-2">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Progress</span>
                      <span className="font-semibold text-gray-900">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${progressColor}`} 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {!locked && (
                    <ArrowRight className="absolute right-3 bottom-3 h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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
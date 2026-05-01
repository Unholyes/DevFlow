import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { CompletePhaseButton } from '@/components/phases/complete-phase-button'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'

function processWorkspaceDestination(projectId: string, phaseId: string, processId: string, methodology: string) {
  const base =
    methodology === 'scrum'
      ? `/dashboard/projects/${projectId}/phases/${phaseId}/processes/${processId}/sprints`
      : `/dashboard/projects/${projectId}/phases/${phaseId}/processes/${processId}/board`
  return base
}

export default async function PhasePage({ params }: { params: { id: string; phaseId: string } }) {
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

  const { data: project } = await supabase
    .from('projects')
    .select('id,name,phase_gating_enabled')
    .eq('id', params.id)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (!project) notFound()

  const { data: phases } = await supabase
    .from('sdlc_phases')
    .select('id,title,methodology,status,order_index,is_gated')
    .eq('project_id', project.id)
    .order('order_index', { ascending: true })

  const phase = (phases ?? []).find((p) => p.id === params.phaseId)
  if (!phase) notFound()

  let processes:
    | {
        id: string
        name: string
        methodology: 'scrum' | 'kanban' | 'waterfall' | 'devops'
        order_index: number
      }[]
    | null = null

  {
    const attempt = await supabase
      .from('phase_processes')
      .select('id,name,methodology,order_index')
      .eq('phase_id', phase.id)
      .order('order_index', { ascending: true })

    if (attempt.error?.code === 'PGRST204') {
      processes = []
    } else {
      processes = (attempt.data as any[]) ?? []
    }
  }

  const phaseIndex = (phases ?? []).findIndex((p) => p.id === phase.id)
  const prev = phaseIndex > 0 ? (phases ?? [])[phaseIndex - 1] : null

  const isLocked =
    project.phase_gating_enabled && phase.is_gated && phaseIndex > 0 && prev?.status !== 'completed'

  if (isLocked) {
    return (
      <div className="space-y-6">
        <Link
          href={`/dashboard/projects/${project.id}`}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Back to Project Overview
        </Link>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Phase locked</h2>
          <p className="text-sm text-gray-600">
            This phase is locked because phase gating is enabled. Complete the previous phase first to continue.
          </p>
        </div>
      </div>
    )
  }

  const { data: stages } = await supabase
    .from('workflow_stages')
    .select('id,is_done,is_backlog')
    .eq('phase_id', phase.id)
    .eq('organization_id', orgId)

  const doneStageIds = new Set((stages ?? []).filter((s) => s.is_done).map((s) => s.id))
  const backlogStageId = (stages ?? []).find((s) => s.is_backlog)?.id ?? null
  const stageIds = (stages ?? []).map((s) => s.id)

  const { data: sprints } = await supabase
    .from('sprints')
    .select('id,name,status,process_id,story_points_total,start_date,end_date')
    .eq('project_id', project.id)
    .eq('phase_id', phase.id)
    .eq('organization_id', orgId)
    .order('start_date', { ascending: false })

  const { data: tasks } =
    stageIds.length > 0
      ? await supabase
          .from('tasks')
          .select('id,process_id,workflow_stage_id,completed_at,story_points,sprint_id')
          .eq('project_id', project.id)
          .eq('organization_id', orgId)
          .in('workflow_stage_id', stageIds)
      : { data: [] as any[] }

  const openSprints = (sprints ?? []).filter((s) => s.status === 'active' || s.status === 'planned')
  const hasAnyOpenSprint = openSprints.length > 0

  const allPhaseTasksDone = (tasks ?? []).every(
    (t) => !!t.completed_at || doneStageIds.has(t.workflow_stage_id)
  )
  const canCompletePhase = !hasAnyOpenSprint && allPhaseTasksDone && phase.status !== 'completed'

  const processesWithStats = (processes ?? []).map((p) => {
    const processTasks = (tasks ?? []).filter((t) => t.process_id === p.id)
    const total = processTasks.length
    const done = processTasks.filter((t) => !!t.completed_at || doneStageIds.has(t.workflow_stage_id)).length
    const percent = total ? Math.round((done / total) * 100) : 0

    const processOpenSprint = openSprints.find((s) => s.process_id === p.id) ?? null
    const sprintTasks = processOpenSprint
      ? (tasks ?? []).filter((t) => t.sprint_id === processOpenSprint.id)
      : []
    const sprintTotalPoints = sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0)
    const sprintDonePoints = sprintTasks.reduce(
      (sum, t) => sum + ((t.completed_at || doneStageIds.has(t.workflow_stage_id)) ? (t.story_points || 0) : 0),
      0
    )
    const sprintPercent = sprintTotalPoints ? Math.round((sprintDonePoints / sprintTotalPoints) * 100) : 0

    return {
      ...p,
      stats: {
        totalTasks: total,
        doneTasks: done,
        percent,
        openSprint: processOpenSprint,
        sprintPercent,
      },
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/projects/${project.id}`}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Back to Project Overview
        </Link>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-medium text-gray-900">{project.name}</h1>
            <span className="text-gray-400">→</span>
            <h2 className="text-xl font-bold text-blue-600">{phase.title} Phase</h2>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {(processes ?? []).length} process{(processes ?? []).length === 1 ? '' : 'es'}
            </span>
          </div>
          <CompletePhaseButton
            phaseId={phase.id}
            disabled={!canCompletePhase}
            reason={
              phase.status === 'completed'
                ? 'Phase already completed'
                : hasAnyOpenSprint
                  ? 'Complete/close the active sprint first'
                  : !allPhaseTasksDone
                    ? 'Move all tasks into a done column first'
                  : undefined
            }
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Processes in this phase</h3>
          <span className="text-xs text-gray-500">{(processes ?? []).length} configured</span>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          Each process has its own SDLC workspace (Scrum or Kanban). Select one to view progress and start work.
        </p>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {processesWithStats.length > 0 ? (
            processesWithStats.map((process) => {
              const href = processWorkspaceDestination(project.id, phase.id, process.id, process.methodology)
              const progress = process.stats.percent
              const sprint = process.stats.openSprint

              return (
                <Link
                  key={process.id}
                  href={href}
                  className="group rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{process.name}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {process.methodology === 'scrum' ? 'Scrum workspace' : 'Kanban board'}
                        {process.methodology === 'scrum' && backlogStageId ? ' • Backlog enabled' : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] uppercase tracking-wide text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {process.methodology}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>Completion</span>
                      <span className="font-semibold text-gray-900">
                        {progress}% • {process.stats.doneTasks}/{process.stats.totalTasks} tasks
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    {process.methodology === 'scrum' ? (
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-600">
                          {sprint ? (
                            <>
                              Open sprint: <span className="font-semibold text-gray-900">{sprint.name}</span> (
                              {process.stats.sprintPercent}% points done)
                            </>
                          ) : (
                            'No active/planned sprint'
                          )}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <p className="mt-4 text-xs text-blue-600 font-medium group-hover:text-blue-700">
                    Open workspace →
                  </p>
                </Link>
              )
            })
          ) : (
            <div className="text-sm text-gray-500">No processes configured for this phase.</div>
          )}
        </div>
      </div>
    </div>
  )
}
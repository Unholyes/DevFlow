import { notFound, redirect } from 'next/navigation'
import KanbanView from '@/components/project/KanbanView'
import ScrumView from '@/components/project/ScrumView'
import { KanbanProcessChrome } from '@/components/processes/kanban-process-chrome'
import { ScrumProcessChrome } from '@/components/processes/scrum-process-chrome'
import { processBoardPath } from '@/lib/processes/process-workspace-routes'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import { ensureKanbanPhaseWorkflowStructure } from '@/lib/kanban/ensure-default-workflow-stages'

export default async function ProcessBoardPage({
  params,
  searchParams,
}: {
  params: { id: string; phaseId: string; processId: string }
  searchParams?: { sprintId?: string }
}) {
  const tenantSlug = getTenantSlug()
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const orgId = tenantSlug
    ? (await supabase.from('organizations').select('id').eq('slug', tenantSlug).maybeSingle()).data?.id ?? null
    : await resolvePrimaryOrgIdForUser(supabase as any, user.id)

  if (!orgId) redirect('/onboarding')

  const { data: orgTeams } = await supabase
    .from('teams')
    .select('id,name')
    .eq('organization_id', orgId)
    .order('name')

  const teamsForOrg = (orgTeams ?? []) as { id: string; name: string }[]

  const { data: project } = await supabase
    .from('projects')
    .select('id,phase_gating_enabled')
    .eq('id', params.id)
    .eq('organization_id', orgId)
    .maybeSingle()
  if (!project) notFound()

  const { data: phases } = await supabase
    .from('sdlc_phases')
    .select('id,status,order_index,is_gated')
    .eq('project_id', project.id)
    .order('order_index', { ascending: true })

  const phase = (phases ?? []).find((p) => p.id === params.phaseId)
  if (!phase) notFound()

  const phaseIndex = (phases ?? []).findIndex((p) => p.id === phase.id)
  const prev = phaseIndex > 0 ? (phases ?? [])[phaseIndex - 1] : null
  const isLocked =
    project.phase_gating_enabled && (phase as any).is_gated && phaseIndex > 0 && (prev as any)?.status !== 'completed'

  if (isLocked) {
    return redirect(`/dashboard/projects/${params.id}/phases/${params.phaseId}`)
  }

  const { data: process } = await supabase
    .from('phase_processes')
    .select('id,name,methodology,wip_exclude_blocked')
    .eq('id', params.processId)
    .eq('phase_id', phase.id)
    .eq('organization_id', orgId)
    .maybeSingle()
  if (!process) notFound()

  if (process.methodology === 'kanban') {
    await ensureKanbanPhaseWorkflowStructure(supabase as any, orgId, phase.id)
  }

  const { data: allProcesses } = await supabase
    .from('phase_processes')
    .select('id,name,methodology,order_index')
    .eq('phase_id', phase.id)
    .order('order_index', { ascending: true })

  const { data: stages } = await supabase
    .from('workflow_stages')
    .select('id,name,stage_order,is_done,is_backlog,wip_limit')
    .eq('phase_id', phase.id)
    .eq('organization_id', orgId)
    .order('stage_order', { ascending: true })

  const stageIds = (stages ?? []).map((s) => s.id)

  if (process.methodology === 'scrum') {
    const requestedSprintId =
      typeof searchParams?.sprintId === 'string' && searchParams.sprintId.trim().length > 0
        ? searchParams.sprintId.trim()
        : null

    const { data: sprint } = requestedSprintId
      ? await supabase
          .from('sprints')
          .select('id,name,status,start_date')
          .eq('id', requestedSprintId)
          .eq('project_id', project.id)
          .eq('phase_id', phase.id)
          .eq('organization_id', orgId)
          .eq('process_id', process.id)
          .maybeSingle()
      : await supabase
          .from('sprints')
          .select('id,name,status,start_date')
          .eq('project_id', project.id)
          .eq('phase_id', phase.id)
          .eq('organization_id', orgId)
          .eq('process_id', process.id)
          .in('status', ['active', 'planned', 'closed'])
          .order('start_date', { ascending: false })
          .limit(1)
          .maybeSingle()

    const sprintRow = (sprint as any) ?? null

    const { data: sprintTasks } =
      sprintRow?.id && stageIds.length > 0
        ? await supabase
            .from('tasks')
            .select('id,title,priority,story_points,workflow_stage_id,completed_at,position,team_id,assignee_id')
            .eq('project_id', project.id)
            .eq('organization_id', orgId)
            .eq('process_id', process.id)
            .eq('sprint_id', sprintRow.id)
            .order('position', { ascending: true })
        : { data: [] as any[] }

    return (
      <ScrumProcessChrome
        projectId={project.id}
        phaseId={phase.id}
        processId={process.id}
        processName={process.name}
        currentTab="board"
        allProcesses={(allProcesses ?? []) as { id: string; name: string; methodology: string }[]}
      >
        <ScrumView
          projectId={project.id}
          phaseId={phase.id}
          processId={process.id}
          sprint={
            sprintRow
              ? ({ id: sprintRow.id, name: sprintRow.name, status: sprintRow.status } as any)
              : null
          }
          stages={(stages ?? []) as any}
          tasks={(sprintTasks ?? []) as any}
          teams={teamsForOrg}
        />
      </ScrumProcessChrome>
    )
  }

  // Kanban tasks for this process: include rows regardless of sprint_id so the board stays
  // consistent with phase overview stats (which do not filter on sprint_id). Scrum work stays
  // on the sprint-scoped query above.
  //
  // If migrations/kanban_flow_metrics.sql has not been applied, selecting flow columns fails and
  // PostgREST returns no rows — we retry with a base column list so cards still load.
  let tasks: any[] | null = null
  let tasksError: { message?: string; code?: string } | null = null

  if (stageIds.length > 0) {
    const {
      KANBAN_TASK_COLUMNS_FULL,
      KANBAN_TASK_COLUMNS_NO_TYPE,
      KANBAN_TASK_COLUMNS_BASE,
      isMissingTaskColumnError,
    } = await import('@/lib/tasks/kanban-task-columns')

    const baseQuery = (cols: string) =>
      supabase
        .from('tasks')
        .select(cols)
        .eq('project_id', project.id)
        .eq('organization_id', orgId)
        .eq('process_id', process.id)
        .in('workflow_stage_id', stageIds)
        .order('position', { ascending: true })

    let resFinal = await baseQuery(KANBAN_TASK_COLUMNS_FULL)
    if (resFinal.error && isMissingTaskColumnError(String(resFinal.error.message ?? ''), (resFinal.error as { code?: string }).code)) {
      resFinal = await baseQuery(KANBAN_TASK_COLUMNS_NO_TYPE)
    }
    if (resFinal.error && isMissingTaskColumnError(String(resFinal.error.message ?? ''), (resFinal.error as { code?: string }).code)) {
      console.warn('[ProcessBoardPage] Retrying tasks query with base columns only.')
      resFinal = await baseQuery(KANBAN_TASK_COLUMNS_BASE)
    }

    tasks = resFinal.data ?? []
    tasksError = resFinal.error ?? null
    if (tasksError) {
      console.error('[ProcessBoardPage] tasks query failed', tasksError)
    }
  } else {
    tasks = []
  }

  return (
    <KanbanProcessChrome
      projectId={project.id}
      phaseId={phase.id}
      processId={process.id}
      processName={process.name}
      currentTab="board"
      allProcesses={(allProcesses ?? []) as { id: string; name: string; methodology: string }[]}
    >
      <KanbanView
        projectId={project.id}
        phaseId={phase.id}
        processId={process.id}
        initialWipExcludeBlocked={(process as { wip_exclude_blocked?: boolean }).wip_exclude_blocked === true}
        stages={(stages ?? []) as any}
        tasks={(tasks ?? []) as any}
        teams={teamsForOrg}
      />
    </KanbanProcessChrome>
  )
}


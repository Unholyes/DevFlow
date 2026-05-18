import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import { ensureKanbanPhaseWorkflowStructure } from '@/lib/kanban/ensure-default-workflow-stages'
import { computeKanbanProcessSummary } from '@/lib/kanban/compute-process-summary'
import { computeKanbanFlowAnalytics } from '@/lib/kanban/compute-flow-analytics'
import { loadRecentActivity } from '@/lib/activity/load-recent-activity'
import { KanbanProcessChrome } from '@/components/processes/kanban-process-chrome'
import { KanbanSummaryPageClient } from '@/components/kanban/kanban-summary-page-client'
import { ScrumProcessChrome } from '@/components/processes/scrum-process-chrome'
import { ScrumSummaryPageClient } from '@/components/scrum/scrum-summary-page-client'
import { computeScrumProcessSummary } from '@/lib/scrum/compute-process-summary'
import { computeSprintBurndown } from '@/lib/scrum/compute-sprint-burndown'
import { processWorkspacePath } from '@/lib/processes/process-workspace-routes'

const SUMMARY_TASK_COLUMNS =
  'id,title,workflow_stage_id,completed_at,priority,task_type,blocked,blocked_reason,assignee_id,team_id,created_at,updated_at,due_date,current_stage_entered_at'

const SUMMARY_TASK_COLUMNS_NO_TYPE =
  'id,title,workflow_stage_id,completed_at,priority,blocked,blocked_reason,assignee_id,team_id,created_at,updated_at,due_date,current_stage_entered_at'

const SUMMARY_TASK_COLUMNS_FALLBACK =
  'id,title,workflow_stage_id,completed_at,priority,assignee_id,team_id,created_at,updated_at,due_date,blocked,blocked_reason'

export default async function KanbanProcessSummaryPage({
  params,
}: {
  params: { id: string; phaseId: string; processId: string }
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

  if (process.methodology !== 'kanban' && process.methodology !== 'scrum') {
    return redirect(processWorkspacePath(params.id, phase.id, process.id, process.methodology))
  }

  const { data: allProcesses } = await supabase
    .from('phase_processes')
    .select('id,name,methodology,order_index')
    .eq('phase_id', phase.id)
    .order('order_index', { ascending: true })

  const allProcessesList = (allProcesses ?? []) as { id: string; name: string; methodology: string }[]

  if (process.methodology === 'scrum') {
    const { data: sprints } = await supabase
      .from('sprints')
      .select('id,name,start_date,end_date,status,story_points_total')
      .eq('project_id', project.id)
      .eq('phase_id', phase.id)
      .eq('organization_id', orgId)
      .eq('process_id', process.id)
      .order('start_date', { ascending: false })

    const sprintIds = (sprints ?? []).map((s) => s.id)

    let processTasks: Record<string, unknown>[] = []
    const taskCols =
      'id,title,sprint_id,completed_at,story_points,priority,blocked,blocked_reason,created_at,updated_at,due_date'
    const taskRes = await supabase
      .from('tasks')
      .select(taskCols)
      .eq('project_id', project.id)
      .eq('organization_id', orgId)
      .eq('process_id', process.id)
    if (!taskRes.error) {
      processTasks = (taskRes.data ?? []) as Record<string, unknown>[]
    } else {
      const msg = String(taskRes.error.message ?? '').toLowerCase()
      if (msg.includes('blocked') || taskRes.error.code === '42703') {
        const fallbackRes = await supabase
          .from('tasks')
          .select(
            'id,title,sprint_id,completed_at,story_points,priority,created_at,updated_at,due_date'
          )
          .eq('project_id', project.id)
          .eq('organization_id', orgId)
          .eq('process_id', process.id)
        if (!fallbackRes.error) processTasks = (fallbackRes.data ?? []) as Record<string, unknown>[]
      }
    }

    const tasksBySprint: Record<
      string,
      { total: number; completed: number; points_completed: number }
    > = {}
    for (const t of processTasks) {
      const sid = t.sprint_id as string | null
      if (!sid) continue
      tasksBySprint[sid] ||= { total: 0, completed: 0, points_completed: 0 }
      tasksBySprint[sid].total += 1
      if (t.completed_at) {
        tasksBySprint[sid].completed += 1
        tasksBySprint[sid].points_completed += Number(t.story_points ?? 0)
      }
    }

    const sprintRows = (sprints ?? []).map((s) => {
      const stats = tasksBySprint[s.id] || { total: 0, completed: 0, points_completed: 0 }
      return {
        id: s.id,
        name: s.name,
        status: s.status as 'planned' | 'active' | 'closed',
        start_date: s.start_date,
        end_date: s.end_date,
        story_points_total: Number(s.story_points_total ?? 0),
        tasks_total: stats.total,
        tasks_completed: stats.completed,
        points_completed: stats.points_completed,
      }
    })

    const backlogTasks = processTasks.filter((t) => !t.sprint_id)
    const backlogStoryPoints = backlogTasks.reduce((s, t) => s + Number(t.story_points ?? 0), 0)

    const summary = computeScrumProcessSummary(
      processTasks.map((t) => ({
        id: String(t.id),
        sprint_id: (t.sprint_id as string | null) ?? null,
        completed_at: (t.completed_at as string | null) ?? null,
        story_points: t.story_points != null ? Number(t.story_points) : null,
        priority: String(t.priority ?? 'medium'),
        blocked: Boolean(t.blocked),
        assignee_id: null,
        created_at: String(t.created_at ?? new Date().toISOString()),
        updated_at: (t.updated_at as string | null) ?? null,
        due_date: (t.due_date as string | null) ?? null,
      })),
      sprintRows,
      {
        backlogTaskCount: backlogTasks.length,
        backlogStoryPoints,
        blockedWithTitles: processTasks
          .filter((t) => t.blocked)
          .map((t) => ({
            id: String(t.id),
            title: String(t.title ?? 'Blocked item'),
            blocked_reason: (t.blocked_reason as string | null) ?? null,
          })),
      }
    )

    const activeSprintId = summary.activeSprint?.id ?? null
    const activeSprintMeta = activeSprintId
      ? (sprints ?? []).find((s) => s.id === activeSprintId)
      : null
    const burndown =
      activeSprintMeta && activeSprintId
        ? computeSprintBurndown(
            {
              start_date: activeSprintMeta.start_date,
              end_date: activeSprintMeta.end_date,
              story_points_total: Number(activeSprintMeta.story_points_total ?? 0),
            },
            processTasks
              .filter((t) => t.sprint_id === activeSprintId)
              .map((t) => ({
                story_points: t.story_points != null ? Number(t.story_points) : null,
                completed_at: (t.completed_at as string | null) ?? null,
              }))
          )
        : { points: [], scopePoints: 0 }

    const recentActivity = await loadRecentActivity(supabase as any, {
      organizationId: orgId,
      projectId: project.id,
      processId: process.id,
      limit: 12,
    })

    return (
      <ScrumProcessChrome
        projectId={project.id}
        phaseId={phase.id}
        processId={process.id}
        processName={process.name}
        currentTab="summary"
        allProcesses={allProcessesList}
      >
        <ScrumSummaryPageClient
          projectId={project.id}
          phaseId={phase.id}
          processId={process.id}
          processName={process.name}
          summary={summary}
          burndown={burndown}
          recentActivity={recentActivity}
        />
      </ScrumProcessChrome>
    )
  }

  await ensureKanbanPhaseWorkflowStructure(supabase as any, orgId, phase.id)

  const { data: stages } = await supabase
    .from('workflow_stages')
    .select('id,name,stage_order,is_done,is_backlog,wip_limit')
    .eq('phase_id', phase.id)
    .eq('organization_id', orgId)
    .order('stage_order', { ascending: true })

  const stageIds = (stages ?? []).map((s) => s.id)

  let tasks: Record<string, unknown>[] = []
  if (stageIds.length > 0) {
    const baseQuery = (cols: string) =>
      supabase
        .from('tasks')
        .select(cols)
        .eq('project_id', project.id)
        .eq('organization_id', orgId)
        .eq('process_id', process.id)
        .in('workflow_stage_id', stageIds)

    let res = await baseQuery(SUMMARY_TASK_COLUMNS)
    if (res.error) {
      const msg = String(res.error.message ?? '').toLowerCase()
      const code = (res.error as { code?: string }).code
      if (msg.includes('task_type') || msg.includes('current_stage_entered_at') || code === '42703') {
        res = await baseQuery(SUMMARY_TASK_COLUMNS_NO_TYPE)
      }
    }
    if (res.error) {
      const msg = String(res.error.message ?? '').toLowerCase()
      if (msg.includes('blocked') || msg.includes('current_stage_entered_at') || res.error.code === '42703') {
        res = await baseQuery(SUMMARY_TASK_COLUMNS_FALLBACK)
      }
    }
    if (!res.error) tasks = (res.data ?? []) as unknown as Record<string, unknown>[]
  }

  const wipExcludeBlocked = (process as { wip_exclude_blocked?: boolean }).wip_exclude_blocked === true

  const flowTasks = tasks.map((t) => ({
    id: String(t.id),
    title: String(t.title ?? 'Untitled'),
    workflow_stage_id: String(t.workflow_stage_id ?? ''),
    completed_at: (t.completed_at as string | null) ?? null,
    blocked: Boolean(t.blocked),
    created_at: String(t.created_at ?? new Date().toISOString()),
    current_stage_entered_at: (t.current_stage_entered_at as string | null) ?? null,
    updated_at: (t.updated_at as string | null) ?? null,
  }))

  const flowStages = (stages ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    is_done: Boolean(s.is_done),
    is_backlog: Boolean(s.is_backlog),
    stage_order: Number(s.stage_order ?? 0),
    wip_limit: s.wip_limit != null ? Number(s.wip_limit) : null,
  }))

  const flowAnalytics = computeKanbanFlowAnalytics(flowTasks, flowStages, wipExcludeBlocked)

  const assigneeIds = [
    ...new Set(tasks.map((t) => t.assignee_id).filter((id): id is string => typeof id === 'string')),
  ]
  const assigneeNames: Record<string, string> = {}
  if (assigneeIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id,full_name').in('id', assigneeIds)
    for (const p of profiles ?? []) {
      if (p.id) assigneeNames[p.id] = p.full_name?.trim() || 'Unnamed'
    }
  }

  const recentActivity = await loadRecentActivity(supabase as any, {
    organizationId: orgId,
    projectId: project.id,
    processId: process.id,
    limit: 12,
  })

  const summary = computeKanbanProcessSummary(
    tasks.map((t) => ({
      id: String(t.id),
      workflow_stage_id: (t.workflow_stage_id as string | null) ?? null,
      completed_at: (t.completed_at as string | null) ?? null,
      priority: String(t.priority ?? 'medium'),
      task_type: (t.task_type as string | null) ?? null,
      blocked: Boolean(t.blocked),
      assignee_id: (t.assignee_id as string | null) ?? null,
      team_id: (t.team_id as string | null) ?? null,
      created_at: String(t.created_at ?? new Date().toISOString()),
      updated_at: (t.updated_at as string | null) ?? null,
      due_date: (t.due_date as string | null) ?? null,
    })),
    (stages ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      is_done: Boolean(s.is_done),
      is_backlog: Boolean(s.is_backlog),
      stage_order: Number(s.stage_order ?? 0),
    })),
    {
      assigneeNames,
      blockedWithTitles: tasks
        .filter((t) => t.blocked)
        .map((t) => ({
          id: String(t.id),
          title: String(t.title ?? 'Blocked item'),
          blocked_reason: (t.blocked_reason as string | null) ?? null,
        })),
    }
  )

  return (
    <KanbanProcessChrome
      projectId={project.id}
      phaseId={phase.id}
      processId={process.id}
      processName={process.name}
      currentTab="summary"
      allProcesses={allProcessesList}
    >
      <KanbanSummaryPageClient
        projectId={project.id}
        phaseId={phase.id}
        processId={process.id}
        processName={process.name}
        summary={summary}
        flowAnalytics={flowAnalytics}
        recentActivity={recentActivity}
      />
    </KanbanProcessChrome>
  )
}

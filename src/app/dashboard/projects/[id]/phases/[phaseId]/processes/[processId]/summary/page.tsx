import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import { ensureKanbanPhaseWorkflowStructure } from '@/lib/kanban/ensure-default-workflow-stages'
import { computeKanbanProcessSummary } from '@/lib/kanban/compute-process-summary'
import { KanbanProcessChrome } from '@/components/processes/kanban-process-chrome'
import { KanbanSummaryPageClient } from '@/components/kanban/kanban-summary-page-client'
import { processWorkspacePath } from '@/lib/processes/process-workspace-routes'

const SUMMARY_TASK_COLUMNS =
  'id,title,workflow_stage_id,completed_at,priority,task_type,blocked,blocked_reason,assignee_id,team_id,created_at,updated_at,due_date'

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
    .select('id,name,methodology')
    .eq('id', params.processId)
    .eq('phase_id', phase.id)
    .eq('organization_id', orgId)
    .maybeSingle()
  if (!process) notFound()

  if (process.methodology !== 'kanban') {
    return redirect(processWorkspacePath(params.id, phase.id, process.id, process.methodology))
  }

  await ensureKanbanPhaseWorkflowStructure(supabase as any, orgId, phase.id)

  const { data: allProcesses } = await supabase
    .from('phase_processes')
    .select('id,name,methodology,order_index')
    .eq('phase_id', phase.id)
    .order('order_index', { ascending: true })

  const { data: stages } = await supabase
    .from('workflow_stages')
    .select('id,name,stage_order,is_done,is_backlog')
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
      if (msg.includes('task_type') || res.error.code === '42703') {
        res = await baseQuery(SUMMARY_TASK_COLUMNS_FALLBACK)
      }
    }
    if (!res.error) tasks = (res.data ?? []) as unknown as Record<string, unknown>[]
  }

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
      allProcesses={(allProcesses ?? []) as { id: string; name: string; methodology: string }[]}
    >
      <KanbanSummaryPageClient
        projectId={project.id}
        phaseId={phase.id}
        processId={process.id}
        processName={process.name}
        summary={summary}
      />
    </KanbanProcessChrome>
  )
}

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProcessMethodology } from '@/lib/processes/process-workspace-routes'

export type ReportsProcessNode = {
  id: string
  name: string
  methodology: ProcessMethodology | string
  orderIndex: number
}

export type ReportsPhaseNode = {
  id: string
  title: string
  orderIndex: number
  processes: ReportsProcessNode[]
}

export type ReportsProjectNode = {
  id: string
  name: string
  phases: ReportsPhaseNode[]
}

export type ReportsTaskRow = {
  id: string
  projectId: string
  phaseId: string
  processId: string | null
  workflowStageId: string | null
  completedAt: string | null
  assigneeId: string | null
  blocked: boolean
  priority: string
  createdAt: string
  updatedAt: string | null
}

export type ReportsStageMeta = {
  id: string
  phaseId: string
  name: string
  isDone: boolean
  isBacklog: boolean
}

export type ReportsScopeData = {
  projects: ReportsProjectNode[]
  tasks: ReportsTaskRow[]
  stagesById: Record<string, ReportsStageMeta>
  processMetaById: Record<
    string,
    { projectId: string; phaseId: string; name: string; methodology: string }
  >
  assigneeNames: Record<string, string>
}

export async function loadReportsScope(
  supabase: SupabaseClient,
  organizationId: string
): Promise<ReportsScopeData> {
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id,name')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true })

  if (projectsError) {
    console.error('loadReportsScope projects:', projectsError)
    return { projects: [], tasks: [], stagesById: {}, processMetaById: {}, assigneeNames: {} }
  }

  const projectIds = (projects ?? []).map((p) => p.id)
  if (projectIds.length === 0) {
    return { projects: [], tasks: [], stagesById: {}, processMetaById: {}, assigneeNames: {} }
  }

  const { data: phases } = await supabase
    .from('sdlc_phases')
    .select('id,title,project_id,order_index')
    .in('project_id', projectIds)
    .order('order_index', { ascending: true })

  const phaseIds = (phases ?? []).map((p) => p.id)

  let processes: { id: string; name: string; methodology: string; phase_id: string; order_index: number }[] =
    []
  if (phaseIds.length > 0) {
    const { data: procRows, error: procError } = await supabase
      .from('phase_processes')
      .select('id,name,methodology,phase_id,order_index')
      .eq('organization_id', organizationId)
      .in('phase_id', phaseIds)
      .order('order_index', { ascending: true })

    if (procError?.code === 'PGRST204') {
      processes = []
    } else {
      processes = (procRows ?? []) as typeof processes
    }
  }

  const processMetaById: ReportsScopeData['processMetaById'] = {}
  const phaseIdByProjectId = new Map<string, Map<string, ReportsPhaseNode>>()

  for (const ph of phases ?? []) {
    if (!phaseIdByProjectId.has(ph.project_id)) {
      phaseIdByProjectId.set(ph.project_id, new Map())
    }
    phaseIdByProjectId.get(ph.project_id)!.set(ph.id, {
      id: ph.id,
      title: ph.title,
      orderIndex: ph.order_index ?? 0,
      processes: [],
    })
  }

  for (const proc of processes) {
    const phase = (phases ?? []).find((p) => p.id === proc.phase_id)
    if (!phase) continue
    const projectId = phase.project_id
    processMetaById[proc.id] = {
      projectId,
      phaseId: proc.phase_id,
      name: proc.name,
      methodology: proc.methodology,
    }
    const phaseNode = phaseIdByProjectId.get(projectId)?.get(proc.phase_id)
    if (phaseNode) {
      phaseNode.processes.push({
        id: proc.id,
        name: proc.name,
        methodology: proc.methodology,
        orderIndex: proc.order_index ?? 0,
      })
    }
  }

  const projectNodes: ReportsProjectNode[] = (projects ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    phases: [...(phaseIdByProjectId.get(p.id)?.values() ?? [])].sort(
      (a, b) => a.orderIndex - b.orderIndex
    ),
  }))

  const stagesById: Record<string, ReportsStageMeta> = {}
  if (phaseIds.length > 0) {
    const { data: stageRows } = await supabase
      .from('workflow_stages')
      .select('id,phase_id,name,is_done,is_backlog')
      .eq('organization_id', organizationId)
      .in('phase_id', phaseIds)

    for (const s of stageRows ?? []) {
      stagesById[s.id] = {
        id: s.id,
        phaseId: s.phase_id,
        name: s.name,
        isDone: Boolean(s.is_done),
        isBacklog: Boolean(s.is_backlog),
      }
    }
  }

  const stageIds = Object.keys(stagesById)
  let taskRows: ReportsTaskRow[] = []

  if (stageIds.length > 0) {
    const cols =
      'id,project_id,process_id,workflow_stage_id,completed_at,assignee_id,blocked,priority,created_at,updated_at'
    const res = await supabase
      .from('tasks')
      .select(cols)
      .eq('organization_id', organizationId)
      .in('workflow_stage_id', stageIds)

    let rawTasks: Record<string, unknown>[] = (res.data ?? []) as Record<string, unknown>[]
    if (res.error) {
      const msg = String(res.error.message ?? '').toLowerCase()
      if (msg.includes('blocked') || res.error.code === '42703') {
        const fallback = await supabase
          .from('tasks')
          .select(
            'id,project_id,process_id,workflow_stage_id,completed_at,assignee_id,priority,created_at,updated_at'
          )
          .eq('organization_id', organizationId)
          .in('workflow_stage_id', stageIds)
        if (!fallback.error) rawTasks = (fallback.data ?? []) as Record<string, unknown>[]
      }
    }

    taskRows = rawTasks.map((t) => {
      const workflowStageId = t.workflow_stage_id as string | null | undefined
      const processId = t.process_id as string | null | undefined
      const stage = workflowStageId ? stagesById[workflowStageId] : null
      const proc = processId ? processMetaById[processId] : null
      const phaseId = proc?.phaseId ?? stage?.phaseId ?? ''
      return {
        id: String(t.id),
        projectId: String(t.project_id),
        phaseId,
        processId: processId ?? null,
        workflowStageId: workflowStageId ?? null,
        completedAt: (t.completed_at as string | null) ?? null,
        assigneeId: (t.assignee_id as string | null) ?? null,
        blocked: Boolean(t.blocked),
        priority: String(t.priority ?? 'medium'),
        createdAt: String(t.created_at ?? new Date().toISOString()),
        updatedAt: (t.updated_at as string | null) ?? null,
      }
    })
  }

  const assigneeIds = [...new Set(taskRows.map((t) => t.assigneeId).filter((id): id is string => !!id))]
  const assigneeNames: Record<string, string> = {}
  if (assigneeIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id,full_name').in('id', assigneeIds)
    for (const p of profiles ?? []) {
      if (p.id) assigneeNames[p.id] = p.full_name?.trim() || 'Unnamed'
    }
  }

  return {
    projects: projectNodes,
    tasks: taskRows,
    stagesById,
    processMetaById,
    assigneeNames,
  }
}

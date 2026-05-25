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
  // Batch 1: Fetch org-level entities in parallel
  const [projectsRes, procRes, stagesRes, tasksRes] = await Promise.all([
    supabase
      .from('projects')
      .select('id,name')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true }),
    supabase
      .from('phase_processes')
      .select('id,name,methodology,phase_id,order_index')
      .eq('organization_id', organizationId)
      .order('order_index', { ascending: true }),
    supabase
      .from('workflow_stages')
      .select('id,phase_id,name,is_done,is_backlog')
      .eq('organization_id', organizationId),
    supabase
      .from('tasks')
      .select('id,project_id,process_id,workflow_stage_id,completed_at,assignee_id,blocked,priority,created_at,updated_at')
      .eq('organization_id', organizationId)
  ])

  if (projectsRes.error) {
    console.error('loadReportsScope projects:', projectsRes.error)
    return { projects: [], tasks: [], stagesById: {}, processMetaById: {}, assigneeNames: {} }
  }

  const projects = projectsRes.data ?? []
  const projectIds = projects.map((p) => p.id)
  if (projectIds.length === 0) {
    return { projects: [], tasks: [], stagesById: {}, processMetaById: {}, assigneeNames: {} }
  }

  // Handle tasks fallback for missing `blocked` column (PGRST204/42703)
  let rawTasks = (tasksRes.data ?? []) as Record<string, unknown>[]
  if (tasksRes.error) {
    const msg = String(tasksRes.error.message ?? '').toLowerCase()
    if (msg.includes('blocked') || (tasksRes.error as any).code === '42703') {
      const fallbackTasks = await supabase
        .from('tasks')
        .select('id,project_id,process_id,workflow_stage_id,completed_at,assignee_id,priority,created_at,updated_at')
        .eq('organization_id', organizationId)
      if (!fallbackTasks.error) rawTasks = (fallbackTasks.data ?? []) as Record<string, unknown>[]
    }
  }

  const processes = procRes.error?.code === 'PGRST204' ? [] : (procRes.data ?? [])
  const stagesById: Record<string, ReportsStageMeta> = {}
  for (const s of stagesRes.data ?? []) {
    stagesById[s.id] = {
      id: s.id,
      phaseId: s.phase_id,
      name: s.name,
      isDone: Boolean(s.is_done),
      isBacklog: Boolean(s.is_backlog),
    }
  }

  // Batch 2: Fetch sdlc_phases (depends on projectIds) and profiles (depends on tasks)
  const assigneeIds = [...new Set(rawTasks.map((t) => t.assignee_id as string).filter((id): id is string => !!id))]
  
  const [phasesRes, profilesRes] = await Promise.all([
    supabase
      .from('sdlc_phases')
      .select('id,title,project_id,order_index')
      .in('project_id', projectIds)
      .order('order_index', { ascending: true }),
    assigneeIds.length > 0
      ? supabase.from('profiles').select('id,full_name').in('id', assigneeIds)
      : Promise.resolve({ data: [] })
  ])

  const phases = phasesRes.data ?? []
  const processMetaById: ReportsScopeData['processMetaById'] = {}
  const phaseIdByProjectId = new Map<string, Map<string, ReportsPhaseNode>>()

  for (const ph of phases) {
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
    const phase = phases.find((p) => p.id === proc.phase_id)
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

  const projectNodes: ReportsProjectNode[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    phases: [...(phaseIdByProjectId.get(p.id)?.values() ?? [])].sort(
      (a, b) => a.orderIndex - b.orderIndex
    ),
  }))

  const taskRows: ReportsTaskRow[] = rawTasks.map((t) => {
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

  const assigneeNames: Record<string, string> = {}
  for (const p of profilesRes.data ?? []) {
    if (p.id) assigneeNames[p.id] = p.full_name?.trim() || 'Unnamed'
  }

  return {
    projects: projectNodes,
    tasks: taskRows,
    stagesById,
    processMetaById,
    assigneeNames,
  }
}

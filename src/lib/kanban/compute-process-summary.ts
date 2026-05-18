import { TASK_TYPES, type TaskType } from '@/lib/tasks/task-type'

export type KanbanSummaryTaskRow = {
  id: string
  workflow_stage_id: string | null
  completed_at: string | null
  priority: string
  task_type?: string | null
  blocked?: boolean | null
  assignee_id?: string | null
  team_id?: string | null
  created_at: string
  updated_at?: string | null
  due_date?: string | null
}

export type KanbanSummaryStageRow = {
  id: string
  name: string
  is_done: boolean
  is_backlog: boolean
  stage_order: number
}

export type CountBucket = { key: string; label: string; count: number; color?: string }

export type KanbanProcessSummaryData = {
  totalWorkItems: number
  activity7d: {
    completed: number
    updated: number
    created: number
    dueSoon: number
  }
  statusByStage: CountBucket[]
  priorityBreakdown: CountBucket[]
  typesOfWork: CountBucket[]
  teamWorkload: CountBucket[]
  blockedTasks: { id: string; title: string; blocked_reason: string | null }[]
  flow: {
    throughput7d: number
    avgLeadTimeDays30d: number | null
  }
  openNotDone: number
  doneCount: number
}

const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low'] as const
const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-blue-500',
}

const TYPE_LABELS: Record<TaskType, string> = {
  task: 'Task',
  bug: 'Bug',
  story: 'Story',
  epic: 'Epic',
  subtask: 'Subtask',
}

function daysAgoIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function isWithinDays(iso: string | null | undefined, days: number) {
  if (!iso) return false
  return new Date(iso).getTime() >= new Date(daysAgoIso(days)).getTime()
}

function isDueWithinDays(dueDate: string | null | undefined, days: number) {
  if (!dueDate) return false
  const due = new Date(dueDate)
  if (Number.isNaN(due.getTime())) return false
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setDate(end.getDate() + days)
  return due >= now && due <= end
}

export function computeKanbanProcessSummary(
  tasks: KanbanSummaryTaskRow[],
  stages: KanbanSummaryStageRow[],
  options?: {
    assigneeNames?: Record<string, string>
    blockedWithTitles?: { id: string; title: string; blocked_reason: string | null }[]
  }
): KanbanProcessSummaryData {
  const stageById = new Map(stages.map((s) => [s.id, s]))
  const totalWorkItems = tasks.length

  const activity7d = {
    completed: tasks.filter((t) => isWithinDays(t.completed_at, 7)).length,
    updated: tasks.filter((t) => isWithinDays(t.updated_at ?? t.created_at, 7) && !t.completed_at).length,
    created: tasks.filter((t) => isWithinDays(t.created_at, 7)).length,
    dueSoon: tasks.filter((t) => !t.completed_at && isDueWithinDays(t.due_date, 7)).length,
  }

  const statusCounts = new Map<string, CountBucket>()
  for (const stage of [...stages].sort((a, b) => a.stage_order - b.stage_order)) {
    statusCounts.set(stage.id, { key: stage.id, label: stage.name, count: 0 })
  }
  for (const t of tasks) {
    const sid = t.workflow_stage_id
    if (!sid) continue
    const bucket = statusCounts.get(sid)
    if (bucket) bucket.count += 1
    else {
      const name = stageById.get(sid)?.name ?? 'Unknown'
      statusCounts.set(sid, { key: sid, label: name, count: 1 })
    }
  }
  const statusByStage = [...statusCounts.values()].filter((b) => b.count > 0 || stages.some((s) => s.id === b.key))

  const priorityCounts: Record<string, number> = {}
  for (const p of PRIORITY_ORDER) priorityCounts[p] = 0
  for (const t of tasks) {
    const p = (t.priority ?? 'medium').toLowerCase()
    priorityCounts[p] = (priorityCounts[p] ?? 0) + 1
  }
  const priorityBreakdown = PRIORITY_ORDER.map((p) => ({
    key: p,
    label: p.charAt(0).toUpperCase() + p.slice(1),
    count: priorityCounts[p] ?? 0,
    color: PRIORITY_COLORS[p],
  })).filter((b) => b.count > 0)

  const typeCounts: Record<string, number> = {}
  for (const tt of TASK_TYPES) typeCounts[tt] = 0
  for (const t of tasks) {
    const tt = (t.task_type ?? 'task') as TaskType
    if (TASK_TYPES.includes(tt)) typeCounts[tt] += 1
    else typeCounts.task += 1
  }
  const typesOfWork = TASK_TYPES.map((tt) => ({
    key: tt,
    label: TYPE_LABELS[tt],
    count: typeCounts[tt] ?? 0,
  })).filter((b) => b.count > 0)

  const workloadMap = new Map<string, number>()
  for (const t of tasks) {
    if (t.completed_at) continue
    const key = t.assignee_id?.trim() || '__unassigned__'
    workloadMap.set(key, (workloadMap.get(key) ?? 0) + 1)
  }
  const names = options?.assigneeNames ?? {}
  const teamWorkload = [...workloadMap.entries()]
    .map(([key, count]) => ({
      key,
      label: key === '__unassigned__' ? 'Unassigned' : names[key] ?? 'Assignee',
      count,
    }))
    .sort((a, b) => b.count - a.count)

  const blockedFromTasks = tasks.filter((t) => t.blocked)
  const blockedTasks =
    options?.blockedWithTitles ??
    blockedFromTasks.map((t) => ({
      id: t.id,
      title: (t as { title?: string }).title ?? 'Blocked item',
      blocked_reason: (t as { blocked_reason?: string | null }).blocked_reason ?? null,
    }))

  const sevenDaysAgo = daysAgoIso(7)
  const thirtyDaysAgo = daysAgoIso(30)
  const throughput7d = tasks.filter(
    (t) => t.completed_at && new Date(t.completed_at).getTime() >= new Date(sevenDaysAgo).getTime()
  ).length

  const leadSamples = tasks
    .filter((t) => t.completed_at && new Date(t.completed_at).getTime() >= new Date(thirtyDaysAgo).getTime())
    .map((t) => {
      const end = new Date(t.completed_at!).getTime()
      const start = new Date(t.created_at).getTime()
      return (end - start) / 86400000
    })
    .filter((d) => Number.isFinite(d) && d >= 0)

  const avgLeadTimeDays30d =
    leadSamples.length > 0 ? leadSamples.reduce((a, b) => a + b, 0) / leadSamples.length : null

  let openNotDone = 0
  let doneCount = 0
  for (const t of tasks) {
    const stage = t.workflow_stage_id ? stageById.get(t.workflow_stage_id) : null
    const isDone = !!t.completed_at || !!stage?.is_done
    if (isDone) doneCount += 1
    else openNotDone += 1
  }

  return {
    totalWorkItems,
    activity7d,
    statusByStage: statusByStage.length > 0 ? statusByStage : [{ key: 'none', label: 'No items', count: 0 }],
    priorityBreakdown,
    typesOfWork,
    teamWorkload,
    blockedTasks,
    flow: { throughput7d, avgLeadTimeDays30d },
    openNotDone,
    doneCount,
  }
}

import type { ReportsScopeData, ReportsTaskRow } from '@/lib/reports/load-reports-scope'

export type ReportsDateRange = '7d' | '30d' | '90d'

export type ReportsFilter = {
  projectId: string | null
  phaseId: string | null
  processId: string | null
  range: ReportsDateRange
}

const RANGE_DAYS: Record<ReportsDateRange, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

const STATUS_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#22c55e', '#f97316', '#ec4899', '#14b8a6', '#94a3b8']

function rangeStartIso(range: ReportsDateRange) {
  const d = new Date()
  d.setDate(d.getDate() - RANGE_DAYS[range])
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function filterTasksByScope(tasks: ReportsTaskRow[], filter: ReportsFilter): ReportsTaskRow[] {
  return tasks.filter((t) => {
    if (filter.projectId && t.projectId !== filter.projectId) return false
    if (filter.phaseId && t.phaseId !== filter.phaseId) return false
    if (filter.processId && t.processId !== filter.processId) return false
    return true
  })
}

export function computeStatusBreakdown(
  tasks: ReportsTaskRow[],
  stagesById: ReportsScopeData['stagesById']
) {
  const counts = new Map<string, { name: string; value: number }>()
  for (const t of tasks) {
    const stage = t.workflowStageId ? stagesById[t.workflowStageId] : null
    const name = stage?.name ?? 'Unknown'
    const key = t.workflowStageId ?? name
    const prev = counts.get(key)
    if (prev) prev.value += 1
    else counts.set(key, { name, value: 1 })
  }
  return [...counts.values()]
    .sort((a, b) => b.value - a.value)
    .map((row, i) => ({
      name: row.name,
      value: row.value,
      color: STATUS_COLORS[i % STATUS_COLORS.length],
    }))
}

export function computeWorkload(
  tasks: ReportsTaskRow[],
  assigneeNames: Record<string, string>
) {
  const open = tasks.filter((t) => !t.completedAt)
  const counts = new Map<string, number>()
  for (const t of open) {
    const key = t.assigneeId ?? '__unassigned__'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const rows = [...counts.entries()].map(([key, n]) => ({
    name: key === '__unassigned__' ? 'Unassigned' : assigneeNames[key] ?? 'Assignee',
    tasks: n,
  }))
  const max = Math.max(...rows.map((r) => r.tasks), 1)
  return rows.sort((a, b) => b.tasks - a.tasks).map((r) => ({ ...r, max }))
}

export function computeCompletionTrend(tasks: ReportsTaskRow[], range: ReportsDateRange) {
  const start = new Date(rangeStartIso(range))
  const byDay = new Map<string, { completed: number; remaining: number }>()

  const days = RANGE_DAYS[range]
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    byDay.set(key, { completed: 0, remaining: 0 })
  }

  for (const t of tasks) {
    if (t.completedAt) {
      const key = new Date(t.completedAt).toISOString().slice(0, 10)
      if (byDay.has(key)) byDay.get(key)!.completed += 1
    }
  }

  const openCount = tasks.filter((t) => !t.completedAt).length
  const keys = [...byDay.keys()].sort()
  let runningRemaining = openCount + keys.reduce((s, k) => s + (byDay.get(k)?.completed ?? 0), 0)

  return keys.map((date) => {
    const completed = byDay.get(date)?.completed ?? 0
    runningRemaining = Math.max(0, runningRemaining - completed)
    const label = new Date(date + 'T12:00:00').toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
    return { date: label, completed, remaining: runningRemaining }
  })
}

export function computeScopeStats(tasks: ReportsTaskRow[], stagesById: ReportsScopeData['stagesById']) {
  let open = 0
  let done = 0
  let blocked = 0
  for (const t of tasks) {
    const stage = t.workflowStageId ? stagesById[t.workflowStageId] : null
    const isDone = !!t.completedAt || !!stage?.isDone
    if (isDone) done += 1
    else open += 1
    if (t.blocked && !isDone) blocked += 1
  }
  return { total: tasks.length, open, done, blocked }
}

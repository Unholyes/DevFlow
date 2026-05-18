export type ScrumSummaryTaskRow = {
  id: string
  sprint_id: string | null
  completed_at: string | null
  story_points: number | null
  priority: string
  blocked?: boolean | null
  assignee_id?: string | null
  created_at: string
  updated_at?: string | null
  due_date?: string | null
}

export type ScrumSummarySprintRow = {
  id: string
  name: string
  status: 'planned' | 'active' | 'closed'
  start_date: string
  end_date: string
  story_points_total: number
  tasks_total: number
  tasks_completed: number
  points_completed: number
}

export type CountBucket = { key: string; label: string; count: number; color?: string }

export type ScrumProcessSummaryData = {
  sprintCounts: { total: number; active: number; closed: number; planned: number }
  backlog: { taskCount: number; storyPoints: number }
  velocity: {
    avgPointsPerClosedSprint: number | null
    recentClosed: { sprintId: string; name: string; points: number }[]
  }
  activity7d: {
    completed: number
    updated: number
    created: number
    dueSoon: number
  }
  priorityBreakdown: CountBucket[]
  blockedTasks: { id: string; title: string; blocked_reason: string | null }[]
  activeSprint: {
    id: string
    name: string
    status: string
    start_date: string
    end_date: string
    tasks_total: number
    tasks_completed: number
    points_total: number
    points_completed: number
    progressPct: number
    daysRemaining: number | null
  } | null
}

const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low'] as const
const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-blue-500',
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

function daysRemaining(endDate: string): number | null {
  const end = new Date(endDate)
  if (Number.isNaN(end.getTime())) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
}

function pickActiveSprint(sprints: ScrumSummarySprintRow[]): ScrumSummarySprintRow | null {
  const active = sprints.filter((s) => s.status === 'active')
  if (active.length > 0) {
    return [...active].sort((a, b) => b.start_date.localeCompare(a.start_date))[0]
  }
  const planned = sprints.filter((s) => s.status === 'planned')
  if (planned.length > 0) {
    return [...planned].sort((a, b) => a.start_date.localeCompare(b.start_date))[0]
  }
  return null
}

export function computeScrumProcessSummary(
  tasks: ScrumSummaryTaskRow[],
  sprints: ScrumSummarySprintRow[],
  options?: {
    backlogTaskCount?: number
    backlogStoryPoints?: number
    blockedWithTitles?: { id: string; title: string; blocked_reason: string | null }[]
  }
): ScrumProcessSummaryData {
  const sprintCounts = {
    total: sprints.length,
    active: sprints.filter((s) => s.status === 'active' || s.status === 'planned').length,
    closed: sprints.filter((s) => s.status === 'closed').length,
    planned: sprints.filter((s) => s.status === 'planned').length,
  }

  const backlogTasks = tasks.filter((t) => !t.sprint_id && !t.completed_at)
  const backlog = {
    taskCount: options?.backlogTaskCount ?? backlogTasks.length,
    storyPoints: options?.backlogStoryPoints ?? backlogTasks.reduce((s, t) => s + Number(t.story_points ?? 0), 0),
  }

  const closedSprints = [...sprints]
    .filter((s) => s.status === 'closed')
    .sort((a, b) => b.end_date.localeCompare(a.end_date))
  const recentClosed = closedSprints.slice(0, 6).map((s) => ({
    sprintId: s.id,
    name: s.name,
    points: s.points_completed,
  }))
  const closedWithPoints = closedSprints.filter((s) => s.points_completed > 0)
  const avgPointsPerClosedSprint =
    closedWithPoints.length > 0
      ? Math.round(
          closedWithPoints.reduce((sum, s) => sum + s.points_completed, 0) / closedWithPoints.length
        )
      : closedSprints.length > 0
        ? Math.round(
            closedSprints.reduce((sum, s) => sum + s.points_completed, 0) / closedSprints.length
          )
        : null

  const activity7d = {
    completed: tasks.filter((t) => isWithinDays(t.completed_at, 7)).length,
    updated: tasks.filter((t) => isWithinDays(t.updated_at ?? t.created_at, 7) && !t.completed_at).length,
    created: tasks.filter((t) => isWithinDays(t.created_at, 7)).length,
    dueSoon: tasks.filter((t) => !t.completed_at && isDueWithinDays(t.due_date, 7)).length,
  }

  const priorityCounts: Record<string, number> = {}
  for (const t of tasks.filter((x) => !x.completed_at)) {
    const p = (t.priority || 'medium').toLowerCase()
    priorityCounts[p] = (priorityCounts[p] ?? 0) + 1
  }
  const priorityBreakdown: CountBucket[] = PRIORITY_ORDER.map((p) => ({
    key: p,
    label: p.charAt(0).toUpperCase() + p.slice(1),
    count: priorityCounts[p] ?? 0,
    color: PRIORITY_COLORS[p],
  })).filter((b) => b.count > 0)

  const activeRow = pickActiveSprint(sprints)
  let activeSprint: ScrumProcessSummaryData['activeSprint'] = null
  if (activeRow) {
    const progressPct =
      activeRow.tasks_total > 0
        ? Math.round((activeRow.tasks_completed / activeRow.tasks_total) * 100)
        : activeRow.story_points_total > 0
          ? Math.round((activeRow.points_completed / activeRow.story_points_total) * 100)
          : 0
    activeSprint = {
      id: activeRow.id,
      name: activeRow.name,
      status: activeRow.status,
      start_date: activeRow.start_date,
      end_date: activeRow.end_date,
      tasks_total: activeRow.tasks_total,
      tasks_completed: activeRow.tasks_completed,
      points_total: activeRow.story_points_total ?? 0,
      points_completed: activeRow.points_completed,
      progressPct,
      daysRemaining: daysRemaining(activeRow.end_date),
    }
  }

  return {
    sprintCounts,
    backlog,
    velocity: {
      avgPointsPerClosedSprint: avgPointsPerClosedSprint,
      recentClosed,
    },
    activity7d,
    priorityBreakdown,
    blockedTasks: options?.blockedWithTitles ?? [],
    activeSprint,
  }
}

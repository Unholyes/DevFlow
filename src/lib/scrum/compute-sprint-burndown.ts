export type BurndownTaskRow = {
  story_points: number | null
  completed_at: string | null
}

export type BurndownSprintRow = {
  start_date: string
  end_date: string
  story_points_total: number
}

export type BurndownChartPoint = {
  date: string
  label: string
  ideal: number
  remaining: number
  completed: number
}

function toDateKey(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toISOString().slice(0, 10)
}

function enumerateDays(start: string, end: string): string[] {
  const s = new Date(start)
  const e = new Date(end)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return []
  s.setHours(0, 0, 0, 0)
  e.setHours(0, 0, 0, 0)
  const days: string[] = []
  const cur = new Date(s)
  while (cur.getTime() <= e.getTime()) {
    days.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

/** Ideal + actual remaining story points by calendar day for the active sprint window. */
export function computeSprintBurndown(
  sprint: BurndownSprintRow,
  tasks: BurndownTaskRow[]
): { points: BurndownChartPoint[]; scopePoints: number } {
  const days = enumerateDays(sprint.start_date, sprint.end_date)
  if (days.length === 0) {
    return { points: [], scopePoints: 0 }
  }

  const scopeFromTasks = tasks.reduce((s, t) => s + Number(t.story_points ?? 0), 0)
  const scopePoints = Math.max(sprint.story_points_total || 0, scopeFromTasks)

  const completedByDay = new Map<string, number>()
  for (const t of tasks) {
    if (!t.completed_at) continue
    const key = toDateKey(t.completed_at)
    completedByDay.set(key, (completedByDay.get(key) ?? 0) + Number(t.story_points ?? 0))
  }

  let cumulativeCompleted = 0
  const todayKey = new Date().toISOString().slice(0, 10)
  const n = days.length

  const points: BurndownChartPoint[] = days.map((date, i) => {
    const dayComplete = completedByDay.get(date) ?? 0
    cumulativeCompleted += dayComplete
    const ideal = Math.max(0, scopePoints - (scopePoints * i) / Math.max(1, n - 1))
    const remaining = Math.max(0, scopePoints - cumulativeCompleted)
    const label = new Date(date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    return {
      date,
      label,
      ideal: Math.round(ideal * 10) / 10,
      remaining: date <= todayKey ? Math.round(remaining * 10) / 10 : Math.round(remaining * 10) / 10,
      completed: Math.round(cumulativeCompleted * 10) / 10,
    }
  })

  return { points, scopePoints }
}

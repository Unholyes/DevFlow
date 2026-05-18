import type { TaskStatus } from '@/types'

export type MemberAttentionInput = {
  status: TaskStatus
  dueDate: string | null
}

export type MemberAttentionMetrics = {
  assigned: number
  overdue: number
  blocked: number
  inProgress: number
  dueThisWeek: number
}

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDaysIso(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function computeMemberAttentionMetrics(tasks: MemberAttentionInput[]): MemberAttentionMetrics {
  const today = todayDateOnly()
  const weekEnd = addDaysIso(today, 7)
  let assigned = 0
  let overdue = 0
  let blocked = 0
  let inProgress = 0
  let dueThisWeek = 0

  for (const task of tasks) {
    if (task.status === 'done') continue

    assigned += 1

    if (task.status === 'blocked') blocked += 1
    if (task.status === 'in_progress' || task.status === 'in_review') inProgress += 1

    const due = task.dueDate
    if (!due) continue

    if (due < today) overdue += 1
    else if (due >= today && due <= weekEnd) dueThisWeek += 1
  }

  return { assigned, overdue, blocked, inProgress, dueThisWeek }
}

export type TaskStatusCounts = Record<TaskStatus, number>

export function countTasksByStatus(tasks: Array<{ status: TaskStatus }>): TaskStatusCounts {
  const counts: TaskStatusCounts = {
    todo: 0,
    in_progress: 0,
    in_review: 0,
    done: 0,
    blocked: 0,
  }
  for (const t of tasks) {
    counts[t.status] += 1
  }
  return counts
}

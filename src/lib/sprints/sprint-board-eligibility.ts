import { getLocalDateString } from '@/lib/sprints/sprint-date-validation'

export type SprintStatus = 'draft' | 'planned' | 'active' | 'closed'

export type SprintBoardRow = {
  status: string
  start_date?: string | null
}

/** Sprint is live on the board (active and started on or before today). */
export function isSprintActiveForBoard(
  sprint: SprintBoardRow,
  today: string = getLocalDateString(),
): boolean {
  if (String(sprint.status) !== 'active') return false
  const start = String(sprint.start_date ?? '').trim()
  if (!start) return false
  return start <= today
}

export function canMoveTasksOnSprintBoard(sprint: SprintBoardRow | null | undefined): boolean {
  return sprint != null && isSprintActiveForBoard(sprint)
}

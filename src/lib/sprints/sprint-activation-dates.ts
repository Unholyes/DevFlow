import { isSprintActiveForBoard } from '@/lib/sprints/sprint-board-eligibility'

export type SprintDateFields = {
  start_date?: string | null
  end_date?: string | null
}

/** Validates stored sprint dates before activation (scheduled timebox). */
export function validateSprintScheduledDates(sprint: SprintDateFields): string | null {
  const start = String(sprint.start_date ?? '').trim()
  const end = String(sprint.end_date ?? '').trim()

  if (!start || !end) {
    return 'Set sprint start and end dates before activating (edit in sprint plan).'
  }

  const parsedStart = new Date(start)
  const parsedEnd = new Date(end)
  if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
    return 'Invalid sprint dates'
  }
  if (parsedEnd < parsedStart) {
    return 'End date must be on or after the start date'
  }

  return null
}

export function buildActivateSprintPayload(params: {
  sprintId: string
  startDate: string
  endDate: string
  sprintStartStageId?: string
  fromDraft?: boolean
}) {
  return {
    id: params.sprintId,
    ...(params.fromDraft ? { action: 'approve' as const } : { status: 'active' as const }),
    start_date: params.startDate,
    end_date: params.endDate,
    ...(params.sprintStartStageId ? { sprint_start_stage_id: params.sprintStartStageId } : {}),
  }
}

export function sprintBoardOpensOnStartDate(sprint: SprintDateFields): boolean {
  const start = String(sprint.start_date ?? '').trim()
  if (!start) return false
  return !isSprintActiveForBoard({ status: 'active', start_date: start })
}

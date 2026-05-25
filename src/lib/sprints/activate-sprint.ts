import {
  buildActivateSprintPayload,
  validateSprintScheduledDates,
  type SprintDateFields,
} from '@/lib/sprints/sprint-activation-dates'

export async function activateSprintWithScheduledDates(
  sprint: SprintDateFields & { id: string },
  options?: { sprintStartStageId?: string; fromDraft?: boolean },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const validationError = validateSprintScheduledDates(sprint)
  if (validationError) {
    return { ok: false, error: validationError }
  }

  const start = String(sprint.start_date).trim()
  const end = String(sprint.end_date).trim()

  const res = await fetch('/api/sprints', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(
      buildActivateSprintPayload({
        sprintId: sprint.id,
        startDate: start,
        endDate: end,
        sprintStartStageId: options?.sprintStartStageId,
        fromDraft: options?.fromDraft,
      }),
    ),
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, error: typeof json.error === 'string' ? json.error : 'Failed to activate sprint' }
  }

  return { ok: true }
}

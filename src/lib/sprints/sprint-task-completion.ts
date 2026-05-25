export type SprintTaskCompletionRow = {
  completed_at: string | null
  workflow_stage_id: string | null
}

/** Matches Scrum board: done if completed_at set or task is in an is_done column. */
export function isTaskDoneForSprintClose(
  task: SprintTaskCompletionRow,
  stageIsDoneById: Map<string, boolean>,
): boolean {
  if (task.completed_at) return true
  const stageId = task.workflow_stage_id
  if (stageId && stageIsDoneById.get(stageId)) return true
  return false
}

export function formatUnfinishedActionLabel(action: string | null | undefined): string {
  if (action === 'backlog') return 'Return to backlog'
  if (action === 'next_sprint') return 'Added to selected sprint (Create Sprint)'
  return action ?? '—'
}

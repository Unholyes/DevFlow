/** Shared WIP counting — keep client checks aligned with `enforce_kanban_wip_limit`. */

export type WipCountableTask = {
  id: string
  workflow_stage_id: string
  completed_at: string | null
  blocked?: boolean
}

export type WipCountOptions = {
  excludeTaskId?: string
  /** When true, flagged/blocked impediments do not count toward the column WIP limit. */
  excludeBlockedFromWip?: boolean
}

export function countOpenWipTasksInStage(
  tasks: WipCountableTask[],
  stageId: string,
  options?: WipCountOptions
): number {
  const excludeTaskId = options?.excludeTaskId
  const excludeBlocked = options?.excludeBlockedFromWip === true

  return tasks.filter((t) => {
    if (t.workflow_stage_id !== stageId) return false
    if (t.completed_at != null) return false
    if (excludeTaskId != null && t.id === excludeTaskId) return false
    if (excludeBlocked && t.blocked) return false
    return true
  }).length
}

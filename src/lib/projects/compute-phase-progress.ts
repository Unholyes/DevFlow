export type PhaseProgressTask = {
  workflow_stage_id: string
  completed_at: string | null
  process_id: string | null
}

function isTaskDone(task: PhaseProgressTask, doneStageIds: ReadonlySet<string>): boolean {
  return !!task.completed_at || doneStageIds.has(task.workflow_stage_id)
}

function taskBasedPercent(
  tasks: PhaseProgressTask[],
  doneStageIds: ReadonlySet<string>,
  phaseStatus: string
): number {
  if (tasks.length === 0) return phaseStatus === 'completed' ? 100 : 0
  const done = tasks.filter((t) => isTaskDone(t, doneStageIds)).length
  return Math.min(100, Math.max(0, Math.round((done / tasks.length) * 100)))
}

/**
 * Phase timeline %: share of tasks in the phase that are done
 * (completed_at set or on a workflow stage marked is_done).
 * Matches project-level progress and the phase completion gate.
 */
export function computePhaseProgressPercent(args: {
  phaseId: string
  phaseStatus: string
  tasks: PhaseProgressTask[]
  stageIdToPhaseId: ReadonlyMap<string, string>
  doneStageIds: ReadonlySet<string>
}): number {
  const { phaseId, phaseStatus, tasks, stageIdToPhaseId, doneStageIds } = args
  const phaseTasks = tasks.filter((t) => stageIdToPhaseId.get(t.workflow_stage_id) === phaseId)
  return taskBasedPercent(phaseTasks, doneStageIds, phaseStatus)
}

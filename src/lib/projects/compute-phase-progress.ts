export type PhaseProgressTask = {
  workflow_stage_id: string
  completed_at: string | null
  process_id: string | null
}

export type PhaseProgressProcess = {
  id: string
  phase_id: string
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

function isProcessFullyComplete(
  processTasks: PhaseProgressTask[],
  doneStageIds: ReadonlySet<string>
): boolean {
  if (processTasks.length === 0) return false
  return processTasks.every((t) => isTaskDone(t, doneStageIds))
}

/**
 * Phase timeline %: share of configured processes (and unassigned tasks, if any) that are
 * fully complete — all tasks done. Matches "1 of 3 processes finished" on the phase page.
 * Falls back to task-based % when the phase has no processes configured.
 */
export function computePhaseProgressPercent(args: {
  phaseId: string
  phaseStatus: string
  processes: PhaseProgressProcess[]
  tasks: PhaseProgressTask[]
  stageIdToPhaseId: ReadonlyMap<string, string>
  doneStageIds: ReadonlySet<string>
}): number {
  const { phaseId, phaseStatus, processes, tasks, stageIdToPhaseId, doneStageIds } = args

  const phaseTasks = tasks.filter((t) => stageIdToPhaseId.get(t.workflow_stage_id) === phaseId)
  const phaseProcesses = processes.filter((p) => p.phase_id === phaseId)

  if (phaseProcesses.length === 0) {
    return taskBasedPercent(phaseTasks, doneStageIds, phaseStatus)
  }

  let buckets = 0
  let fullyComplete = 0

  for (const proc of phaseProcesses) {
    buckets += 1
    const processTasks = phaseTasks.filter((t) => t.process_id === proc.id)
    if (isProcessFullyComplete(processTasks, doneStageIds)) fullyComplete += 1
  }

  const orphanTasks = phaseTasks.filter((t) => !t.process_id)
  if (orphanTasks.length > 0) {
    buckets += 1
    if (isProcessFullyComplete(orphanTasks, doneStageIds)) fullyComplete += 1
  }

  if (buckets === 0) {
    return taskBasedPercent(phaseTasks, doneStageIds, phaseStatus)
  }

  return Math.min(100, Math.max(0, Math.round((fullyComplete / buckets) * 100)))
}

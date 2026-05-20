/**
 * Deep link to a task on the process board when process context exists.
 */
export function taskBoardHref(args: {
  projectId: string
  phaseId: string | null
  processId: string | null
  taskId: string
}): string {
  const { projectId, phaseId, processId, taskId } = args
  if (phaseId && processId) {
    return `/dashboard/projects/${projectId}/phases/${phaseId}/processes/${processId}/board?task=${taskId}`
  }
  return `/dashboard/projects/${projectId}`
}

export function phaseOverviewHref(projectId: string, phaseId: string): string {
  return `/dashboard/projects/${projectId}/phases/${phaseId}`
}

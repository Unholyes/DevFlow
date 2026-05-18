export type ProcessMethodology = 'scrum' | 'kanban' | 'waterfall' | 'devops'

/** Default workspace entry when opening a process from the phase overview. */
export function processWorkspacePath(
  projectId: string,
  phaseId: string,
  processId: string,
  methodology: ProcessMethodology | string
) {
  const base = `/dashboard/projects/${projectId}/phases/${phaseId}/processes/${processId}`
  if (methodology === 'scrum') return `${base}/sprints`
  if (methodology === 'kanban') return `${base}/summary`
  return `${base}/board`
}

export function processSummaryPath(projectId: string, phaseId: string, processId: string) {
  return `/dashboard/projects/${projectId}/phases/${phaseId}/processes/${processId}/summary`
}

export function processBoardPath(projectId: string, phaseId: string, processId: string) {
  return `/dashboard/projects/${projectId}/phases/${phaseId}/processes/${processId}/board`
}

export function processBacklogPath(projectId: string, phaseId: string, processId: string) {
  return `/dashboard/projects/${projectId}/phases/${phaseId}/processes/${processId}/backlog`
}

/** Link target when switching between processes in the phase (respects methodology). */
export function processSwitcherPath(
  projectId: string,
  phaseId: string,
  process: { id: string; methodology: string }
) {
  return processWorkspacePath(projectId, phaseId, process.id, process.methodology)
}

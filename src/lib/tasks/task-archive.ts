/** True when the task row is soft-archived (hidden from active board/backlog). */
export function isTaskArchived(task: { archived_at?: string | null }): boolean {
  return task.archived_at != null && task.archived_at !== ''
}

/** Drop archived tasks (safe when `archived_at` is absent on older rows). */
export function filterActiveTasks<T extends { archived_at?: string | null }>(tasks: T[]): T[] {
  return tasks.filter((t) => !isTaskArchived(t))
}

export function isMissingArchivedAtColumnError(message: string, code?: string): boolean {
  const m = message.toLowerCase()
  return code === '42703' || m.includes('archived_at')
}

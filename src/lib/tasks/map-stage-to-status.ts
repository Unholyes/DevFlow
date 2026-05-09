import type { TaskStatus } from '@/types'

type WorkflowStageLite = {
  id: string
  name: string
  is_done: boolean
  is_backlog: boolean
} | null

/** Map workflow stage + completion to dashboard / tasks hub status buckets. */
export function mapStageToStatus(
  stage: WorkflowStageLite,
  completedAt: string | null | undefined,
  blocked?: boolean
): TaskStatus {
  if (blocked) return 'blocked'
  if (completedAt) return 'done'
  if (stage?.is_done) return 'done'
  if (stage?.is_backlog) return 'todo'
  const n = (stage?.name ?? '').toLowerCase()
  if (n.includes('review')) return 'in_review'
  if (n.includes('progress') || n.includes('doing')) return 'in_progress'
  if (n.includes('block')) return 'blocked'
  if (n.includes('done') || n.includes('complete')) return 'done'
  return 'todo'
}

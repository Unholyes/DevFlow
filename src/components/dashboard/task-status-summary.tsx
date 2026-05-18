import type { TaskStatus } from '@/types'
import type { TaskStatusCounts } from '@/lib/dashboard/member-attention'

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'blocked', 'done']

const STATUS_BAR: Record<TaskStatus, { label: string; bar: string }> = {
  todo: { label: 'To do', bar: 'bg-gray-400' },
  in_progress: { label: 'In progress', bar: 'bg-blue-500' },
  in_review: { label: 'In review', bar: 'bg-amber-500' },
  blocked: { label: 'Blocked', bar: 'bg-red-500' },
  done: { label: 'Done', bar: 'bg-emerald-500' },
}

interface TaskStatusSummaryProps {
  counts: TaskStatusCounts
}

export function TaskStatusSummary({ counts }: TaskStatusSummaryProps) {
  const total = STATUS_ORDER.reduce((sum, s) => sum + counts[s], 0)
  if (total === 0) return null

  const segments = STATUS_ORDER.filter((s) => counts[s] > 0)

  return (
    <div className="space-y-2">
      <div
        className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100"
        role="img"
        aria-label={`Task breakdown: ${segments.map((s) => `${counts[s]} ${STATUS_BAR[s].label}`).join(', ')}`}
      >
        {segments.map((status) => (
          <div
            key={status}
            className={`${STATUS_BAR[status].bar} transition-all`}
            style={{ width: `${(counts[status] / total) * 100}%` }}
            title={`${counts[status]} ${STATUS_BAR[status].label}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
        {segments.map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${STATUS_BAR[status].bar}`} aria-hidden />
            <span className="font-medium text-gray-800">{counts[status]}</span>
            {STATUS_BAR[status].label}
          </span>
        ))}
      </div>
    </div>
  )
}

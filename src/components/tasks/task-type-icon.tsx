'use client'

import { cn } from '@/lib/utils'
import { TASK_TYPE_META, normalizeTaskType, type TaskType } from '@/lib/tasks/task-type'

export function TaskTypeIcon({
  type,
  size = 'md',
  showTooltip = true,
  className,
}: {
  type?: TaskType | string | null
  size?: 'sm' | 'md'
  showTooltip?: boolean
  className?: string
}) {
  const normalized = normalizeTaskType(type)
  const meta = TASK_TYPE_META[normalized]
  const Icon = meta.icon
  const box = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6'
  const icon = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded',
        box,
        meta.bgClassName,
        className
      )}
      title={showTooltip ? meta.label : undefined}
      aria-label={meta.label}
      role="img"
    >
      <Icon className={cn(icon, meta.iconClassName)} aria-hidden />
    </span>
  )
}

'use client'

import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BlockedTaskChip({
  reason,
  compact = false,
  className,
}: {
  reason?: string | null
  compact?: boolean
  className?: string
}) {
  const title = reason?.trim()
    ? `Blocked: ${reason.trim()}`
    : 'Blocked — work is impeded until the blocker is resolved'

  if (compact) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
          'bg-red-50 text-red-700 border border-red-100',
          className
        )}
        title={title}
      >
        <AlertTriangle className="h-2.5 w-2.5 shrink-0" aria-hidden />
        Blocked
      </span>
    )
  }

  return (
    <div
      className={cn(
        'flex items-start gap-1.5 rounded-md border border-red-100 bg-red-50/90 px-2 py-1.5 text-[10px] text-red-800',
        className
      )}
      title={title}
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px text-red-600" aria-hidden />
      <span className="min-w-0 leading-snug">
        <span className="font-semibold">Blocked</span>
        {reason?.trim() ? <span className="text-red-700"> — {reason.trim()}</span> : null}
      </span>
    </div>
  )
}


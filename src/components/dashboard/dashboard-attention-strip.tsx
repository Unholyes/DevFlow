import type { ReactNode } from 'react'
import Link from 'next/link'
import { AlertTriangle, Calendar, FolderKanban, ListTodo } from 'lucide-react'
import type { MemberAttentionMetrics } from '@/lib/dashboard/member-attention'

export type SprintAttentionHint = {
  name: string
  endDate: string
  href: string
}

interface DashboardAttentionStripProps {
  metrics: MemberAttentionMetrics
  activeProjectCount: number
  sprintHint: SprintAttentionHint | null
}

function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

type Segment = {
  key: string
  content: ReactNode
  className?: string
}

export function DashboardAttentionStrip({
  metrics,
  activeProjectCount,
  sprintHint,
}: DashboardAttentionStripProps) {
  const segments: Segment[] = []

  if (metrics.overdue > 0) {
    segments.push({
      key: 'overdue',
      className: 'text-red-700 font-medium',
      content: (
        <Link href="/dashboard/tasks" className="inline-flex items-center gap-1.5 hover:underline">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {metrics.overdue} overdue
        </Link>
      ),
    })
  }

  if (metrics.blocked > 0) {
    segments.push({
      key: 'blocked',
      className: 'text-amber-800',
      content: (
        <Link href="/dashboard/tasks" className="hover:underline">
          {metrics.blocked} blocked
        </Link>
      ),
    })
  }

  if (metrics.inProgress > 0) {
    segments.push({
      key: 'in-progress',
      content: (
        <Link href="/dashboard/tasks" className="hover:underline">
          {metrics.inProgress} in progress
        </Link>
      ),
    })
  }

  if (metrics.dueThisWeek > 0) {
    segments.push({
      key: 'due-week',
      content: (
        <Link href="/dashboard/tasks" className="hover:underline">
          {metrics.dueThisWeek} due this week
        </Link>
      ),
    })
  }

  if (metrics.assigned === 0 && metrics.overdue === 0) {
    segments.push({
      key: 'clear',
      content: <span className="text-gray-600">No open tasks assigned to you</span>,
    })
  } else if (segments.length === 0 && metrics.assigned > 0) {
    segments.push({
      key: 'assigned',
      content: (
        <Link href="/dashboard/tasks" className="inline-flex items-center gap-1.5 hover:underline">
          <ListTodo className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />
          {metrics.assigned} open {metrics.assigned === 1 ? 'task' : 'tasks'}
        </Link>
      ),
    })
  }

  if (sprintHint) {
    segments.push({
      key: 'sprint',
      content: (
        <Link href={sprintHint.href} className="inline-flex items-center gap-1.5 hover:underline">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />
          <span>
            Sprint &ldquo;{sprintHint.name}&rdquo; ends {formatShortDate(sprintHint.endDate)}
          </span>
        </Link>
      ),
    })
  }

  if (activeProjectCount > 0) {
    segments.push({
      key: 'projects',
      content: (
        <Link href="/dashboard/projects" className="inline-flex items-center gap-1.5 hover:underline">
          <FolderKanban className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />
          {activeProjectCount} active {activeProjectCount === 1 ? 'project' : 'projects'}
        </Link>
      ),
    })
  }

  if (segments.length === 0) {
    return null
  }

  return (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-gray-200/80 bg-white/90 px-4 py-2.5 text-sm text-gray-700 shadow-sm"
      role="status"
      aria-label="Work summary"
    >
      {segments.map((seg, i) => (
        <span key={seg.key} className={`inline-flex items-center ${seg.className ?? ''}`}>
          {i > 0 ? <span className="mx-2 text-gray-300 select-none" aria-hidden>·</span> : null}
          {seg.content}
        </span>
      ))}
    </div>
  )
}


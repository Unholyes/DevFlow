'use client'

import Link from 'next/link'
import {
  CheckCircle2,
  RefreshCw,
  PlusSquare,
  CalendarClock,
  AlertTriangle,
  LayoutGrid,
  BarChart3,
  Users,
  Layers,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TASK_TYPE_META, type TaskType } from '@/lib/tasks/task-type'
import type { KanbanProcessSummaryData } from '@/lib/kanban/compute-process-summary'
import { processBoardPath } from '@/lib/processes/process-workspace-routes'
import { cn } from '@/lib/utils'

function BarList({ buckets, max }: { buckets: { label: string; count: number; color?: string }[]; max: number }) {
  if (buckets.length === 0) {
    return <p className="text-sm text-gray-500 py-6 text-center">No data yet</p>
  }
  const cap = max > 0 ? max : 1
  return (
    <ul className="space-y-3">
      {buckets.map((b) => (
        <li key={b.label}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-700 truncate pr-2">{b.label}</span>
            <span className="font-semibold text-gray-900 tabular-nums shrink-0">{b.count}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', b.color ?? 'bg-blue-500')}
              style={{ width: `${Math.max(4, (b.count / cap) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

function StatusDonut({ buckets, total }: { buckets: { label: string; count: number }[]; total: number }) {
  const colors = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f97316', '#22c55e', '#14b8a6']
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-3xl font-bold text-gray-300">0</p>
        <p className="text-sm text-gray-500 mt-1">Total work items</p>
      </div>
    )
  }
  let offset = 0
  const segments = buckets.filter((b) => b.count > 0)
  const gradientParts = segments.map((b, i) => {
    const pct = (b.count / total) * 100
    const start = offset
    offset += pct
    return `${colors[i % colors.length]} ${start}% ${offset}%`
  })
  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div
        className="relative h-36 w-36 rounded-full shrink-0"
        style={{ background: `conic-gradient(${gradientParts.join(', ')})` }}
      >
        <div className="absolute inset-4 rounded-full bg-white flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{total}</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wide">Items</span>
        </div>
      </div>
      <ul className="space-y-1.5 text-sm min-w-0 flex-1">
        {segments.map((b, i) => (
          <li key={b.label} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: colors[i % colors.length] }}
            />
            <span className="truncate text-gray-700">{b.label}</span>
            <span className="ml-auto font-medium text-gray-900 tabular-nums">{b.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function KanbanSummaryPageClient(props: {
  projectId: string
  phaseId: string
  processId: string
  processName: string
  summary: KanbanProcessSummaryData
}) {
  const boardHref = processBoardPath(props.projectId, props.phaseId, props.processId)
  const blockedBoardHref = `${boardHref}?blockedOnly=1`
  const maxPriority = Math.max(...props.summary.priorityBreakdown.map((b) => b.count), 1)
  const maxType = Math.max(...props.summary.typesOfWork.map((b) => b.count), 1)
  const maxWorkload = Math.max(...props.summary.teamWorkload.map((b) => b.count), 1)

  const activityCards = [
    { label: 'Completed', value: props.summary.activity7d.completed, icon: CheckCircle2, tone: 'text-green-600' },
    { label: 'Updated', value: props.summary.activity7d.updated, icon: RefreshCw, tone: 'text-blue-600' },
    { label: 'Created', value: props.summary.activity7d.created, icon: PlusSquare, tone: 'text-indigo-600' },
    { label: 'Due soon', value: props.summary.activity7d.dueSoon, icon: CalendarClock, tone: 'text-amber-600' },
  ] as const

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Summary</h1>
          <p className="text-gray-600 mt-1 text-sm">
            Flow and workload for <span className="font-medium text-gray-800">{props.processName}</span> — last 7 days
            activity unless noted.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={boardHref}>Open board</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={blockedBoardHref}>Blocked on board</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {activityCards.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="border-gray-100 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <Icon className={cn('h-4 w-4', tone)} />
                {label}
              </div>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Last 7 days</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-gray-500" />
              Status overview
            </CardTitle>
            <CardDescription>Work items by workflow column on this process</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusDonut buckets={props.summary.statusByStage} total={props.summary.totalWorkItems} />
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-gray-500" />
              Flow metrics
            </CardTitle>
            <CardDescription>Continuous delivery signals for this Kanban stream</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Throughput (7d)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{props.summary.flow.throughput7d}</p>
              <p className="text-xs text-gray-400 mt-1">Items completed</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Avg lead time (30d)</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1 tabular-nums">
                {props.summary.flow.avgLeadTimeDays30d != null
                  ? `${props.summary.flow.avgLeadTimeDays30d.toFixed(1)}d`
                  : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Created → done</p>
            </div>
            <div className="col-span-2 pt-2 border-t border-gray-100 flex gap-4 text-sm">
              <span>
                <span className="text-gray-500">Open:</span>{' '}
                <span className="font-semibold text-blue-600">{props.summary.openNotDone}</span>
              </span>
              <span>
                <span className="text-gray-500">Done:</span>{' '}
                <span className="font-semibold text-green-600">{props.summary.doneCount}</span>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Priority breakdown</CardTitle>
            <CardDescription>How work is prioritized on this process</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList buckets={props.summary.priorityBreakdown} max={maxPriority} />
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-gray-500" />
              Types of work
            </CardTitle>
            <CardDescription>Distribution by work type</CardDescription>
          </CardHeader>
          <CardContent>
            {props.summary.typesOfWork.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">No typed work items yet</p>
            ) : (
              <ul className="space-y-3">
                {props.summary.typesOfWork.map((b) => {
                  const meta = TASK_TYPE_META[b.key as TaskType]
                  const Icon = meta?.icon
                  return (
                    <li key={b.key}>
                      <div className="flex items-center justify-between text-sm mb-1 gap-2">
                        <span className="flex items-center gap-2 min-w-0">
                          {Icon ? (
                            <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded', meta.bgClassName)}>
                              <Icon className={cn('h-3.5 w-3.5', meta.iconClassName)} />
                            </span>
                          ) : null}
                          <span className="text-gray-700">{b.label}</span>
                        </span>
                        <span className="font-semibold tabular-nums">{b.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${Math.max(4, (b.count / maxType) * 100)}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              Team workload
            </CardTitle>
            <CardDescription>Open items per assignee on this process</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList buckets={props.summary.teamWorkload} max={maxWorkload} />
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Blocked impediments
              {props.summary.blockedTasks.length > 0 ? (
                <Badge variant="secondary" className="ml-1 font-normal">
                  {props.summary.blockedTasks.length}
                </Badge>
              ) : null}
            </CardTitle>
            <CardDescription>Items flagged as blocked on this process</CardDescription>
          </CardHeader>
          <CardContent>
            {props.summary.blockedTasks.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">No blocked items — flow is clear.</p>
            ) : (
              <ul className="space-y-2">
                {props.summary.blockedTasks.slice(0, 8).map((t) => (
                  <li
                    key={t.id}
                    className="rounded-lg border border-red-100 bg-red-50/50 px-3 py-2 text-sm"
                  >
                    <p className="font-medium text-gray-900 truncate">{t.title}</p>
                    {t.blocked_reason ? (
                      <p className="text-xs text-red-800/80 mt-0.5 line-clamp-2">{t.blocked_reason}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {props.summary.blockedTasks.length > 0 ? (
              <Button variant="link" size="sm" className="mt-3 px-0" asChild>
                <Link href={blockedBoardHref}>View on board →</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

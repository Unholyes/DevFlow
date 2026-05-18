'use client'

import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import {
  Line,
  LineChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts'
import {
  CheckCircle2,
  RefreshCw,
  PlusSquare,
  CalendarClock,
  AlertTriangle,
  TrendingUp,
  ListTodo,
  Timer,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ScrumProcessSummaryData } from '@/lib/scrum/compute-process-summary'
import type { RecentActivityItem } from '@/lib/activity/load-recent-activity'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import {
  processBoardPath,
  processBacklogPath,
  processSprintPlanPath,
  processSprintsPath,
} from '@/lib/processes/process-workspace-routes'
import { cn } from '@/lib/utils'

function formatSprintDate(iso: string): string {
  try {
    const d = parseISO(iso.length <= 10 ? `${iso}T12:00:00` : iso)
    if (Number.isNaN(d.getTime())) return iso
    return format(d, 'MMM d, yyyy')
  } catch {
    return iso
  }
}

function BarList({ buckets, max }: { buckets: { label: string; count: number; color?: string }[]; max: number }) {
  if (buckets.length === 0) {
    return <p className="text-sm text-gray-500 py-6 text-center">No open work items</p>
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

export function ScrumSummaryPageClient(props: {
  projectId: string
  phaseId: string
  processId: string
  processName: string
  summary: ScrumProcessSummaryData
  burndown: { points: { date: string; label: string; ideal: number; remaining: number }[]; scopePoints: number }
  recentActivity: RecentActivityItem[]
}) {
  const boardHref = processBoardPath(props.projectId, props.phaseId, props.processId)
  const sprintsHref = processSprintsPath(props.projectId, props.phaseId, props.processId)
  const planHref = processSprintPlanPath(props.projectId, props.phaseId, props.processId)
  const backlogHref = processBacklogPath(props.projectId, props.phaseId, props.processId)
  const active = props.summary.activeSprint
  const activeBoardHref = active ? `${boardHref}?sprintId=${encodeURIComponent(active.id)}` : boardHref
  const maxPriority = Math.max(...props.summary.priorityBreakdown.map((b) => b.count), 1)

  const activityCards = [
    { label: 'Completed', value: props.summary.activity7d.completed, icon: CheckCircle2, tone: 'text-green-600' },
    { label: 'Updated', value: props.summary.activity7d.updated, icon: RefreshCw, tone: 'text-blue-600' },
    { label: 'Created', value: props.summary.activity7d.created, icon: PlusSquare, tone: 'text-indigo-600' },
    { label: 'Due soon', value: props.summary.activity7d.dueSoon, icon: CalendarClock, tone: 'text-amber-600' },
  ] as const

  const velocityData = props.summary.velocity.recentClosed.map((s) => ({
    name: s.name.length > 14 ? `${s.name.slice(0, 12)}…` : s.name,
    points: s.points,
  }))

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Summary</h1>
          <p className="text-gray-600 mt-1 text-sm">
            Sprint health and delivery for{' '}
            <span className="font-medium text-gray-800">{props.processName}</span> — last 7 days activity unless
            noted.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={activeBoardHref}>Open board</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={sprintsHref}>All sprints</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={planHref}>Plan sprint</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {activityCards.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="border-gray-100 shadow-sm">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-gray-600">
                <Icon className={cn('h-4 w-4', tone)} />
                <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 tabular-nums mt-2">{value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Last 7 days</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active sprints</p>
            <p className="text-2xl font-bold text-blue-600 tabular-nums mt-2">{props.summary.sprintCounts.active}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Backlog points</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums mt-2">{props.summary.backlog.storyPoints}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{props.summary.backlog.taskCount} tasks</p>
          </CardContent>
        </Card>
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avg velocity</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums mt-2">
              {props.summary.velocity.avgPointsPerClosedSprint ?? '—'}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">pts / closed sprint</p>
          </CardContent>
        </Card>
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Blocked</p>
            <p className="text-2xl font-bold text-amber-600 tabular-nums mt-2">{props.summary.blockedTasks.length}</p>
          </CardContent>
        </Card>
      </div>

      {active ? (
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-3.5 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold text-gray-900">{active.name}</span>
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal capitalize">
                    {active.status}
                  </Badge>
                  {active.daysRemaining != null ? (
                    <span
                      className={cn(
                        'text-[10px] font-medium',
                        active.daysRemaining < 0 ? 'text-red-600' : 'text-gray-500'
                      )}
                    >
                      {active.daysRemaining < 0
                        ? `${Math.abs(active.daysRemaining)}d overdue`
                        : `${active.daysRemaining}d left`}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 tabular-nums">
                  {formatSprintDate(active.start_date)} – {formatSprintDate(active.end_date)}
                  <span className="text-gray-300 mx-1">·</span>
                  {active.tasks_completed}/{active.tasks_total} tasks
                  <span className="text-gray-300 mx-1">·</span>
                  {active.points_completed}/{active.points_total} pts
                </p>
              </div>
              <Link
                href={activeBoardHref}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 shrink-0 pt-0.5"
              >
                Board →
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${Math.min(100, Math.max(0, active.progressPct))}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-600 tabular-nums w-8 text-right">
                {active.progressPct}%
              </span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-gray-200">
          <CardContent className="py-8 text-center text-sm text-gray-500">
            No active or planned sprint.{' '}
            <Link href={planHref} className="text-blue-600 hover:underline font-medium">
              Plan a sprint
            </Link>{' '}
            to start tracking burndown.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Timer className="h-4 w-4 text-gray-500" />
              Sprint burndown
            </CardTitle>
            <CardDescription>
              {active
                ? `Remaining story points vs ideal for ${active.name}`
                : 'Starts when you have an active sprint'}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {props.burndown.points.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={props.burndown.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="ideal" name="Ideal" stroke="#94a3b8" strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="remaining" name="Remaining" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-500 text-center py-16">No burndown data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gray-500" />
              Velocity (closed sprints)
            </CardTitle>
            <CardDescription>Completed story points per sprint</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {velocityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={velocityData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="points" name="Points done" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-500 text-center py-16">Close a sprint to build velocity history.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-gray-500" />
              Open work by priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarList buckets={props.summary.priorityBreakdown} max={maxPriority} />
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
          </CardHeader>
          <CardContent>
            {props.summary.blockedTasks.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">No blocked items on this process.</p>
            ) : (
              <ul className="space-y-2">
                {props.summary.blockedTasks.slice(0, 8).map((t) => (
                  <li
                    key={t.id}
                    className="rounded-lg border border-red-100 bg-red-50/50 px-3 py-2 text-sm"
                  >
                    <p className="font-medium text-gray-900">{t.title}</p>
                    {t.blocked_reason ? (
                      <p className="text-xs text-gray-600 mt-1">{t.blocked_reason}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <Button variant="link" size="sm" className="mt-3 px-0" asChild>
              <Link href={backlogHref}>View backlog →</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <ActivityFeed
        activities={props.recentActivity}
        title="Recent activity"
        description="Task creates, updates, completions, and comments on this process (inferred from timestamps)."
      />
    </div>
  )
}

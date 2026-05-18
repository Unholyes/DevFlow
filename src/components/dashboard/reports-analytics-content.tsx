'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  Calendar,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  ExternalLink,
  LayoutGrid,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { BlockedTaskReportRow } from '@/lib/reports/load-blocked-tasks'
import type { ReportsScopeData } from '@/lib/reports/load-reports-scope'
import type { RecentActivityItem } from '@/lib/activity/load-recent-activity'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import {
  computeCompletionTrend,
  computeScopeStats,
  computeStatusBreakdown,
  computeWorkload,
  filterTasksByScope,
  type ReportsDateRange,
  type ReportsFilter,
} from '@/lib/reports/compute-filtered-reports'
import { processWorkspacePath } from '@/lib/processes/process-workspace-routes'

const ALL = '__all__'

function parseFilter(searchParams: URLSearchParams): ReportsFilter {
  const range = searchParams.get('range')
  const validRange: ReportsDateRange =
    range === '30d' || range === '90d' ? range : '7d'
  return {
    projectId: searchParams.get('project') || null,
    phaseId: searchParams.get('phase') || null,
    processId: searchParams.get('process') || null,
    range: validRange,
  }
}

export function ReportsAnalyticsContent({
  scope,
  blockedTasks = [],
}: {
  scope: ReportsScopeData
  blockedTasks?: BlockedTaskReportRow[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const filter = parseFilter(searchParams)

  const setParams = useCallback(
    (updates: Partial<Record<'project' | 'phase' | 'process' | 'range', string | null>>) => {
      const p = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === '' || value === ALL) p.delete(key)
        else p.set(key, value)
      }
      const q = p.toString()
      router.push(q ? `/dashboard/reports?${q}` : '/dashboard/reports')
    },
    [router, searchParams]
  )

  const selectedProject = scope.projects.find((p) => p.id === filter.projectId) ?? null
  const phasesForProject = selectedProject?.phases ?? []
  const selectedPhase = phasesForProject.find((ph) => ph.id === filter.phaseId) ?? null
  const processesForPhase = selectedPhase?.processes ?? []

  const filteredTasks = useMemo(
    () => filterTasksByScope(scope.tasks, filter),
    [scope.tasks, filter]
  )

  const filteredBlocked = useMemo(() => {
    return blockedTasks.filter((t) => {
      if (filter.projectId && t.projectId !== filter.projectId) return false
      if (filter.phaseId && t.phaseId !== filter.phaseId) return false
      if (filter.processId && t.processId !== filter.processId) return false
      return true
    })
  }, [blockedTasks, filter])

  const stats = useMemo(
    () => computeScopeStats(filteredTasks, scope.stagesById),
    [filteredTasks, scope.stagesById]
  )

  const statusBreakdown = useMemo(
    () => computeStatusBreakdown(filteredTasks, scope.stagesById),
    [filteredTasks, scope.stagesById]
  )

  const workload = useMemo(
    () => computeWorkload(filteredTasks, scope.assigneeNames),
    [filteredTasks, scope.assigneeNames]
  )

  const completionData = useMemo(
    () => computeCompletionTrend(filteredTasks, filter.range),
    [filteredTasks, filter.range]
  )

  const totalTasks = statusBreakdown.reduce((s, x) => s + x.value, 0)

  const scopeLabel = filter.processId
    ? scope.processMetaById[filter.processId]?.name ?? 'Process'
    : filter.phaseId
      ? selectedPhase?.title ?? 'Phase'
      : filter.projectId
        ? selectedProject?.name ?? 'Project'
        : 'Organization'

  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([])
  const [activityLoading, setActivityLoading] = useState(false)

  useEffect(() => {
    const p = new URLSearchParams()
    if (filter.projectId) p.set('project', filter.projectId)
    if (filter.phaseId) p.set('phase', filter.phaseId)
    if (filter.processId) p.set('process', filter.processId)
    p.set('limit', '15')

    const controller = new AbortController()
    setActivityLoading(true)
    fetch(`/api/activity/recent?${p.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((json) => {
        if (Array.isArray(json?.data)) setRecentActivity(json.data)
        else setRecentActivity([])
      })
      .catch((err: { name?: string }) => {
        if (err?.name !== 'AbortError') setRecentActivity([])
      })
      .finally(() => setActivityLoading(false))

    return () => controller.abort()
  }, [filter.projectId, filter.phaseId, filter.processId])

  const visibleProcesses = filter.phaseId
    ? processesForPhase
    : filter.projectId
      ? phasesForProject.flatMap((ph) => ph.processes)
      : scope.projects.flatMap((p) => p.phases.flatMap((ph) => ph.processes.map((proc) => ({ ...proc, phaseId: ph.id, projectId: p.id }))))

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Reports &amp; Analytics</h1>
        <p className="text-gray-600">
          Portfolio view across your workspace. Drill into a process for detailed Kanban or Scrum analytics.
        </p>
      </header>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-gray-600">Project</span>
          <Select
            value={filter.projectId ?? ALL}
            onValueChange={(v) =>
              setParams({
                project: v === ALL ? null : v,
                phase: null,
                process: null,
              })
            }
          >
            <SelectTrigger className="w-[200px] bg-white border-gray-200">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All projects</SelectItem>
              {scope.projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-gray-600">Phase</span>
          <Select
            value={filter.phaseId ?? ALL}
            onValueChange={(v) =>
              setParams({
                project: filter.projectId,
                phase: v === ALL ? null : v,
                process: null,
              })
            }
            disabled={!filter.projectId}
          >
            <SelectTrigger className="w-[200px] bg-white border-gray-200">
              <SelectValue placeholder={filter.projectId ? 'All phases' : 'Select project first'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All phases</SelectItem>
              {phasesForProject.map((ph) => (
                <SelectItem key={ph.id} value={ph.id}>
                  {ph.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-gray-600">Process</span>
          <Select
            value={filter.processId ?? ALL}
            onValueChange={(v) =>
              setParams({
                project: filter.projectId,
                phase: filter.phaseId,
                process: v === ALL ? null : v,
              })
            }
            disabled={!filter.phaseId}
          >
            <SelectTrigger className="w-[220px] bg-white border-gray-200">
              <SelectValue placeholder={filter.phaseId ? 'All processes' : 'Select phase first'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All processes</SelectItem>
              {processesForPhase.map((proc) => (
                <SelectItem key={proc.id} value={proc.id}>
                  {proc.name} ({proc.methodology})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-gray-600">Date range</span>
          <Select
            value={filter.range}
            onValueChange={(v) => setParams({ range: v })}
          >
            <SelectTrigger className="w-[180px] bg-white border-gray-200">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total items', value: stats.total },
          { label: 'Open', value: stats.open, className: 'text-blue-600' },
          { label: 'Done', value: stats.done, className: 'text-green-600' },
          { label: 'Blocked (open)', value: stats.blocked, className: 'text-red-600' },
        ].map((s) => (
          <Card key={s.label} className="border-gray-200 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold tabular-nums ${s.className ?? 'text-gray-900'}`}>{s.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 truncate">{scopeLabel}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {(filter.projectId || filter.phaseId) && visibleProcesses.length > 0 ? (
        <Card className="border-blue-100 bg-blue-50/40 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-blue-600" />
              Process workspaces
            </CardTitle>
            <CardDescription>
              Detailed flow metrics, status breakdown, and workload live on each process Summary (Kanban) or
              Sprints hub (Scrum).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {visibleProcesses.map((proc) => {
                const meta = scope.processMetaById[proc.id]
                const projectId = meta?.projectId ?? filter.projectId ?? ''
                const phaseId = meta?.phaseId ?? ('phaseId' in proc ? (proc as { phaseId: string }).phaseId : filter.phaseId) ?? ''
                if (!projectId || !phaseId) return null
                const href = processWorkspacePath(projectId, phaseId, proc.id, proc.methodology)
                return (
                  <li key={proc.id}>
                    <Link
                      href={href}
                      className="flex items-center justify-between gap-2 rounded-lg border border-blue-200/80 bg-white px-3 py-2.5 text-sm hover:border-blue-300 hover:shadow-sm transition-all"
                    >
                      <span className="min-w-0">
                        <span className="font-medium text-gray-900 block truncate">{proc.name}</span>
                        <span className="text-xs text-gray-500 capitalize">{proc.methodology}</span>
                      </span>
                      <ExternalLink className="h-4 w-4 shrink-0 text-blue-600" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {filter.processId && scope.processMetaById[filter.processId] ? (
        <Card className="border-indigo-200 bg-indigo-50/30">
          <CardContent className="py-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-indigo-900">
              View full analytics for{' '}
              <strong>{scope.processMetaById[filter.processId].name}</strong> on its process workspace.
            </p>
            <Button size="sm" asChild>
              <Link
                href={processWorkspacePath(
                  scope.processMetaById[filter.processId].projectId,
                  scope.processMetaById[filter.processId].phaseId,
                  filter.processId,
                  scope.processMetaById[filter.processId].methodology
                )}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Open process analytics
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Completions over time</CardTitle>
          <CardDescription>
            Items completed per day in the selected range (scoped to filters above)
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[280px]">
          {completionData.some((d) => d.completed > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={completionData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} />
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
                <Line
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm gap-2">
              <p>No completions in this range for the current scope.</p>
              {filter.processId ? (
                <Link
                  href={processWorkspacePath(
                    scope.processMetaById[filter.processId].projectId,
                    scope.processMetaById[filter.processId].phaseId,
                    filter.processId,
                    scope.processMetaById[filter.processId].methodology
                  )}
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Open process workspace <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Team workload</CardTitle>
            <CardDescription>Open items by assignee (current scope)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {workload.length > 0 ? (
              workload.map((row) => (
                <div key={row.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-900">{row.name}</span>
                    <span className="text-gray-500">{row.tasks} open</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all"
                      style={{ width: `${(row.tasks / row.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8 text-sm">No open work in this scope</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Sprint burndown</CardTitle>
            <CardDescription>Available on each Scrum process sprint board</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center text-sm text-gray-500 gap-3">
            <p>Burndown is sprint-scoped. Select a Scrum process above and open its workspace.</p>
            {filter.processId &&
            scope.processMetaById[filter.processId]?.methodology === 'scrum' ? (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={processWorkspacePath(
                    scope.processMetaById[filter.processId].projectId,
                    scope.processMetaById[filter.processId].phaseId,
                    filter.processId,
                    'scrum'
                  )}
                >
                  Go to sprints
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Status by column</CardTitle>
            <CardDescription>Workflow stage distribution (current scope)</CardDescription>
          </CardHeader>
          <CardContent>
            {statusBreakdown.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <div className="relative h-[220px] w-[220px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={68}
                        outerRadius={88}
                        paddingAngle={2}
                      >
                        {statusBreakdown.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} stroke="white" strokeWidth={2} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</span>
                    <span className="text-3xl font-bold text-gray-900">{totalTasks}</span>
                  </div>
                </div>
                <ul className="flex-1 space-y-2.5 w-full max-h-[220px] overflow-y-auto">
                  {statusBreakdown.map((s) => (
                    <li key={s.name} className="flex items-center justify-between text-sm gap-2">
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-3 w-3 rounded-sm shrink-0"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="text-gray-700 truncate">{s.name}</span>
                      </span>
                      <span className="font-medium text-gray-900 tabular-nums shrink-0">({s.value})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8 text-sm">No tasks in this scope</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">Blocked impediments</CardTitle>
              <CardDescription>Open blocked items in current scope</CardDescription>
            </div>
            <Badge variant="destructive" className="font-normal">
              {filteredBlocked.length} blocked
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[360px] overflow-y-auto">
            {filteredBlocked.length > 0 ? (
              filteredBlocked.map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg border border-gray-100 bg-gray-50/80 p-4 space-y-2"
                >
                  <div className="flex gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 leading-snug">{t.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {t.projectName}
                        {t.processName ? ` · ${t.processName}` : ''}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{t.reason}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pl-7">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px]">{t.initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-700">{t.assignee}</span>
                    <span className="text-sm text-red-600">• {t.blockedAgo}</span>
                    {t.workspaceHref ? (
                      <Link
                        href={`${t.workspaceHref}?blockedOnly=1`}
                        className="ml-auto text-xs font-medium text-blue-600 hover:underline inline-flex items-center gap-0.5"
                      >
                        View on board <ArrowRight className="h-3 w-3" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8 text-sm">No blocked tasks in this scope</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Recent activity</CardTitle>
          <CardDescription>
            Inferred from task timestamps and comments — scoped to {scopeLabel.toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <p className="text-sm text-gray-500 text-center py-8">Loading activity…</p>
          ) : (
            <ActivityFeed
              embedded
              activities={recentActivity}
              description=""
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

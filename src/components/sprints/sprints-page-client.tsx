'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Plus, CheckCircle2, PlayCircle, ListTodo, Archive } from 'lucide-react'
import { getLocalDateString } from '@/lib/sprints/sprint-date-validation'
import { isSprintActiveForBoard } from '@/lib/sprints/sprint-board-eligibility'
import { validateSprintScheduledDates } from '@/lib/sprints/sprint-activation-dates'
import { activateSprintWithScheduledDates } from '@/lib/sprints/activate-sprint'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  processBacklogPath,
  processBoardPath,
  processSprintDetailPath,
  processSprintPlanPath,
  processSummaryPath,
} from '@/lib/processes/process-workspace-routes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type SprintRow = {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  status: 'draft' | 'planned' | 'active' | 'closed'
  story_points_total: number
}

function ArchivedSprintCard({
  sprint,
  planHref,
  canManageSprints,
  hasActiveSprint,
  sprintStartStageId,
  onRefresh,
}: {
  sprint: SprintWithStats
  planHref: string
  canManageSprints?: boolean
  hasActiveSprint: boolean
  sprintStartStageId?: string
  onRefresh: () => void
}) {
  const [busy, setBusy] = useState<'delete' | 'approve' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!confirm(`Delete archived proposal "${sprint.name}"? Tasks will return to the backlog.`)) return
    setBusy('delete')
    setError(null)
    try {
      const res = await fetch(`/api/sprints?id=${encodeURIComponent(sprint.id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof json.error === 'string' ? json.error : 'Failed to delete proposal')
      onRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete proposal')
    } finally {
      setBusy(null)
    }
  }

  const scheduleError = validateSprintScheduledDates(sprint)

  const handleApprove = async () => {
    if (hasActiveSprint || scheduleError) return
    setBusy('approve')
    setError(null)
    try {
      const result = await activateSprintWithScheduledDates(sprint, {
        sprintStartStageId,
        fromDraft: true,
      })
      if (!result.ok) throw new Error(result.error)
      onRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to activate sprint')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/40 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-900">{sprint.name}</h3>
          <p className="mt-1 text-xs text-gray-600">
            Archived proposal · {sprint.tasks_total} tasks · {sprint.story_points_total} story points
          </p>
          {sprint.start_date && sprint.end_date ? (
            <p className="mt-1 text-xs text-gray-500 font-medium">
              Suggested dates: {sprint.start_date} to {sprint.end_date}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-amber-100 text-amber-900">Archived</Badge>
          <Link
            href={`${planHref}?draftId=${sprint.id}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View / Edit
          </Link>
        </div>
      </div>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2 items-center">
        {canManageSprints ? (
          <>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              onClick={() => void handleApprove()}
              disabled={busy !== null || hasActiveSprint || Boolean(scheduleError)}
              title={
                scheduleError
                  ? scheduleError
                  : hasActiveSprint
                    ? 'Cannot activate while another sprint is active on the board'
                    : 'Activate using the planned start and end dates'
              }
            >
              {busy === 'approve' ? 'Activating…' : 'Approve & activate'}
            </Button>
            {hasActiveSprint ? (
              <span className="text-xs font-medium text-red-500">Another sprint is already active.</span>
            ) : null}
          </>
        ) : null}
        <Button
          size="sm"
          variant="outline"
          onClick={() => void handleDelete()}
          disabled={busy !== null}
          className="text-red-600 hover:bg-red-50"
        >
          {busy === 'delete' ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </div>
  )
}

function UpcomingSprintCard({
  sprint,
  hasActiveSprint,
  sprintStartStageId,
  onRefresh,
  canManageSprints,
  projectId,
  phaseId,
  processId,
  planHref,
}: {
  sprint: SprintWithStats
  hasActiveSprint: boolean
  sprintStartStageId?: string
  onRefresh: () => void
  canManageSprints?: boolean
  projectId: string
  phaseId: string
  processId?: string
  planHref: string
}) {
  const [busy, setBusy] = useState<'reject' | 'activate' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const scheduleError = validateSprintScheduledDates(sprint)

  const handleActivate = async () => {
    if (hasActiveSprint || scheduleError) return
    setError(null)
    setBusy('activate')
    try {
      const result = await activateSprintWithScheduledDates(sprint, { sprintStartStageId })
      if (!result.ok) throw new Error(result.error)
      onRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to activate sprint')
    } finally {
      setBusy(null)
    }
  }



  const handleReject = async () => {
    if (!confirm(`Reject "${sprint.name}"? Tasks will return to the backlog.`)) return
    setBusy('reject')
    setError(null)
    try {
      const res = await fetch('/api/sprints', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sprint.id, action: 'reject' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to reject sprint')
      onRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reject sprint')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-900">{sprint.name}</h3>
          <p className="mt-1 text-xs text-gray-600">
            {sprint.status === 'planned' ? 'Planned' : 'Scheduled'} · {sprint.tasks_total} tasks ·{' '}
            {sprint.story_points_total} story points
          </p>
          {sprint.start_date && sprint.end_date && (
            <p className="mt-1 text-xs text-gray-500 font-medium">
              Suggested Dates: {sprint.start_date} to {sprint.end_date}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-gray-200 text-gray-800">Upcoming</Badge>
          <Link
            href={
              processId
                ? processSprintDetailPath(projectId, phaseId, processId, sprint.id)
                : `/dashboard/projects/${projectId}/phases/${phaseId}/sprints/${sprint.id}`
            }
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View Details
          </Link>
        </div>
      </div>

      {canManageSprints && (
        <>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2 items-center">
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              onClick={() => void handleActivate()}
              disabled={busy !== null || hasActiveSprint || Boolean(scheduleError)}
              title={
                scheduleError
                  ? scheduleError
                  : hasActiveSprint
                    ? 'Cannot activate while another sprint is active on the board'
                    : `Activate for ${sprint.start_date} → ${sprint.end_date}`
              }
            >
              {busy === 'activate' ? 'Activating…' : 'Activate sprint'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleReject} disabled={busy !== null}>
              {busy === 'reject' ? 'Rejecting...' : 'Reject / Delete'}
            </Button>
            {hasActiveSprint && (
              <span className="text-xs text-red-500 font-medium ml-2">Cannot start sprint while another is active.</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export type SprintWithStats = SprintRow & {
  tasks_total: number
  tasks_completed: number
}

type BacklogTaskRow = {
  id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'critical'
  story_points: number | null
  position: number | null
}

function priorityBadgeClass(priority: BacklogTaskRow['priority']) {
  switch (priority) {
    case 'critical':
      return 'border-red-200 bg-red-50 text-red-700'
    case 'high':
      return 'border-orange-200 bg-orange-50 text-orange-700'
    case 'medium':
      return 'border-blue-200 bg-blue-50 text-blue-700'
    case 'low':
    default:
      return 'border-gray-200 bg-gray-50 text-gray-700'
  }
}

export function SprintsPageClient(props: {
  projectId: string
  phaseId: string
  processId?: string
  processName?: string
  processMethod?: string
  sprints: SprintWithStats[]
  backlogTasks?: BacklogTaskRow[]
  selectedProcessName?: string | null
  selectedMethod?: string | null
  /** When true, chrome provides nav — hide duplicate header/stats. */
  chromeEmbedded?: boolean
  canManageSprints?: boolean
  canCreateSprintDraft?: boolean
  sprintStartStageId?: string
}) {
  const router = useRouter()
  const todayStr = getLocalDateString()

  const activeSprints = props.sprints.filter((s) => isSprintActiveForBoard(s, todayStr))

  const archivedSprints = props.sprints.filter((s) => s.status === 'draft')

  const upcomingSprints = props.sprints.filter(
    (s) =>
      s.status === 'planned' ||
      (s.status === 'active' && !isSprintActiveForBoard(s, todayStr)),
  )
  const completedSprints = props.sprints.filter((s) => s.status === 'closed')
  const totalStoryPoints = props.sprints.reduce((sum, s) => sum + (s.story_points_total || 0), 0)
  const averageVelocity = props.sprints.length ? Math.round(totalStoryPoints / props.sprints.length) : 0
  const backlogTasks = props.backlogTasks ?? []
  const backlogStoryPoints = backlogTasks.reduce((sum, t) => sum + Number(t.story_points ?? 0), 0)
  const embedded = props.chromeEmbedded === true && Boolean(props.processId)
  const planHref = props.processId
    ? processSprintPlanPath(props.projectId, props.phaseId, props.processId)
    : `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/sprints/plan`
  const backlogHref = props.processId
    ? processBacklogPath(props.projectId, props.phaseId, props.processId)
    : null
  const summaryHref = props.processId
    ? processSummaryPath(props.projectId, props.phaseId, props.processId)
    : null

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sprints</h1>
          <p className="text-gray-600 mt-1 text-sm">
            {embedded
              ? 'Create, plan, and review sprints — metrics live on Summary.'
              : 'Manage and track sprints for this phase'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={planHref}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Sprint
          </Link>
        </div>
      </div>

      {/* Removed old draft section */}

      {!embedded ? (
        <>
          {props.processName || props.selectedProcessName ? (
            <Card className="border-blue-200 bg-blue-50 shadow-sm">
              <CardContent className="py-4">
                <p className="text-xs uppercase tracking-wide text-blue-700">Active process</p>
                <p className="mt-1 text-sm font-semibold text-blue-900">
                  {props.processName ?? props.selectedProcessName}{' '}
                  {props.processMethod || props.selectedMethod ? `(${props.processMethod ?? props.selectedMethod})` : ''}
                </p>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Sprints</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{props.sprints.length}</div>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{activeSprints.length}</div>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{completedSprints.length}</div>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Avg Velocity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{averageVelocity}</div>
                <div className="text-xs text-gray-500 mt-1">points/sprint</div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <ListTodo className="h-5 w-5 text-gray-700" />
                Backlog (not in sprint)
              </CardTitle>
              <p className="mt-1 text-sm text-gray-600">
                Tasks ready to be pulled into a sprint for this process.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Backlog tasks</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">{backlogTasks.length}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Story points</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">{backlogStoryPoints}</p>
            </div>
          </div>

          {backlogTasks.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <p>No backlog tasks yet for this process.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {backlogTasks.slice(0, 10).map((t) => (
                <div
                  key={t.id}
                  className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{t.title}</p>
                    {t.description ? (
                      <p className="text-sm text-gray-500 line-clamp-1 mt-1">{t.description}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline" className={`text-xs ${priorityBadgeClass(t.priority)}`}>
                        {t.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs border-gray-200 bg-white text-gray-700">
                        {Number(t.story_points ?? 0)} pts
                      </Badge>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 tabular-nums">#{t.position ?? 0}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Active Sprints</CardTitle>
        </CardHeader>
        <CardContent>
          {activeSprints.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No active sprints yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeSprints.map((sprint) => (
                <div key={sprint.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <PlayCircle className="h-5 w-5 text-blue-600" />
                      <div>
                        <h3 className="font-semibold text-blue-900">{sprint.name}</h3>
                        <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                          <span>
                            {sprint.start_date && sprint.end_date
                              ? `${sprint.start_date} - ${sprint.end_date}`
                              : 'Dates not set'}
                          </span>
                          <span>•</span>
                          <span>{sprint.story_points_total} story points</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-blue-100 text-blue-700">Active</Badge>
                      <Link
                        href={
                          props.processId
                            ? `${processBoardPath(props.projectId, props.phaseId, props.processId)}?sprintId=${encodeURIComponent(
                              sprint.id
                            )}`
                            : `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/sprints/${sprint.id}`
                        }
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                    <span>
                      {sprint.tasks_completed}/{sprint.tasks_total} tasks completed
                    </span>
                    <span>•</span>
                    <span>
                      {sprint.tasks_total
                        ? Math.round((sprint.tasks_completed / sprint.tasks_total) * 100)
                        : 0}
                      % complete
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${sprint.tasks_total ? (sprint.tasks_completed / sprint.tasks_total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {props.canCreateSprintDraft || props.canManageSprints ? (
        <Card className="border-amber-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Archive className="h-5 w-5 text-amber-700" />
              Archived proposals
            </CardTitle>
            <p className="text-sm text-gray-600 font-normal">
              Sprint plans saved from Create Sprint. Edit or delete proposals here; sprint managers can approve and
              start them.
            </p>
          </CardHeader>
          <CardContent>
            {archivedSprints.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No archived sprint proposals yet.</p>
                <p className="mt-1 text-xs">Use &quot;Archive Sprint&quot; on the plan page to save a draft for review.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {archivedSprints.map((sprint) => (
                  <ArchivedSprintCard
                    key={sprint.id}
                    sprint={sprint}
                    planHref={planHref}
                    hasActiveSprint={activeSprints.length > 0}
                    sprintStartStageId={props.sprintStartStageId}
                    onRefresh={() => router.refresh()}
                    canManageSprints={props.canManageSprints}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Sprints</CardTitle>
          <p className="text-sm text-gray-600 font-normal">
            Scheduled sprints not yet on the board. Activate to commit the planned dates; the board opens on the
            start date (only one sprint on the board at a time).
          </p>
        </CardHeader>
        <CardContent>
          {upcomingSprints.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No upcoming sprints yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingSprints.map((sprint) => (
                <UpcomingSprintCard
                  key={sprint.id}
                  sprint={sprint}
                  hasActiveSprint={activeSprints.length > 0}
                  sprintStartStageId={props.sprintStartStageId}
                  onRefresh={() => router.refresh()}
                  canManageSprints={props.canManageSprints}
                  projectId={props.projectId}
                  phaseId={props.phaseId}
                  processId={props.processId}
                  planHref={planHref}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Completed Sprints</CardTitle>
        </CardHeader>
        <CardContent>
          {completedSprints.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No completed sprints yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedSprints.map((sprint) => (
                <div
                  key={sprint.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <h3 className="font-medium text-gray-900">{sprint.name}</h3>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                        <span>
                          {sprint.start_date} - {sprint.end_date}
                        </span>
                        <span>•</span>
                        <span>{sprint.story_points_total} story points</span>
                        <span>•</span>
                        <span>
                          {sprint.tasks_completed}/{sprint.tasks_total} tasks
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link
                    href={
                      props.processId
                        ? processSprintDetailPath(
                          props.projectId,
                          props.phaseId,
                          props.processId,
                          sprint.id
                        )
                        : `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/sprints/${sprint.id}`
                    }
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


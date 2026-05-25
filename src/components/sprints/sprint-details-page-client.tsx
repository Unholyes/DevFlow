'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Calendar, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BacklogTaskCard } from '@/components/project/backlog-task-card'
import { KanbanTaskDetailModal } from '@/components/project/KanbanTaskDetailModal'
import { SprintCompletionModal } from '@/components/project/sprint-completion-modal'
import { processBoardPath } from '@/lib/processes/process-workspace-routes'
import { isSprintActiveForBoard } from '@/lib/sprints/sprint-board-eligibility'
import { sprintBoardOpensOnStartDate, validateSprintScheduledDates } from '@/lib/sprints/sprint-activation-dates'
import { activateSprintWithScheduledDates } from '@/lib/sprints/activate-sprint'
import {
  formatUnfinishedActionLabel,
  isTaskDoneForSprintClose,
} from '@/lib/sprints/sprint-task-completion'

type Sprint = {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  status: 'draft' | 'planned' | 'active' | 'closed'
  story_points_total: number
  summary?: any | null
  retrospective?: any | null
  unfinished_action?: string | null
}

type Task = {
  id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'critical'
  story_points: number | null
  completed_at: string | null
  workflow_stage_id: string | null
  position: number | null
}

export function SprintDetailsPageClient(props: {
  projectId: string
  phaseId: string
  processId?: string
  backlogStageId?: string
  sprintStartStageId?: string
  sprint: Sprint
  tasks: Task[]
  stageIsDoneById?: Record<string, boolean>
  carryoverDraftSprints?: Array<{ id: string; name: string; story_points_total: number }>
  planHref?: string
  sprintCapacityPoints?: number
  canManageSprints?: boolean
  hasActiveSprint?: boolean
  sprintActiveForBoard?: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isCompleteOpen, setIsCompleteOpen] = useState(false)
  const [closeNotice, setCloseNotice] = useState<string | null>(null)
  const [upcomingBusy, setUpcomingBusy] = useState<'start' | 'reject' | null>(null)
  const [upcomingError, setUpcomingError] = useState<string | null>(null)

  const stageIsDoneMap = useMemo(() => {
    const map = new Map<string, boolean>()
    if (props.stageIsDoneById) {
      for (const [id, done] of Object.entries(props.stageIsDoneById)) {
        map.set(id, done)
      }
    }
    return map
  }, [props.stageIsDoneById])

  const sprintActiveForBoard =
    props.sprintActiveForBoard ??
    isSprintActiveForBoard({
      status: props.sprint.status,
      start_date: props.sprint.start_date,
    })
  const canCompleteSprint = props.sprint.status === 'active' && sprintActiveForBoard
  const isUpcomingSprint =
    props.sprint.status === 'planned' ||
    (props.sprint.status === 'active' && !sprintActiveForBoard)

  useEffect(() => {
    const shouldOpen = searchParams.get('complete') === '1'
    if (shouldOpen && canCompleteSprint && props.canManageSprints) setIsCompleteOpen(true)
  }, [searchParams, canCompleteSprint, props.canManageSprints])

  useEffect(() => {
    if (searchParams.get('review') !== '1') return
    const targetName = searchParams.get('carryoverTarget')
    if (targetName) {
      setCloseNotice(`Unfinished tasks were added to sprint draft "${targetName}".`)
    }
  }, [searchParams])
  const [isCompleting, setIsCompleting] = useState(false)
  const [tasks, setTasks] = useState<Task[]>(props.tasks)
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)

  const sprintClosed = props.sprint.status === 'closed'
  const taskDetailReadOnly = sprintClosed || !props.canManageSprints

  const totalTasks = tasks.length
  const isTaskDone = (t: Task) => isTaskDoneForSprintClose(t, stageIsDoneMap)

  const completedTasks = tasks.filter((t) => isTaskDone(t)).length
  const completedPoints = tasks.reduce(
    (sum, t) => sum + (isTaskDone(t) ? t.story_points || 0 : 0),
    0,
  )

  const unfinishedTasks = useMemo(() => tasks.filter((t) => !isTaskDone(t)), [tasks, stageIsDoneMap])

  const sprintData = useMemo(() => {
    return {
      name: props.sprint.name,
      totalPoints: props.sprint.story_points_total,
      completedPoints,
      unfinishedTasks: unfinishedTasks.map((t) => ({
        id: t.id,
        title: t.title,
        storyPoints: t.story_points || 0,
      })),
    }
  }, [completedPoints, props.sprint.name, props.sprint.story_points_total, unfinishedTasks])

  const scheduleError = validateSprintScheduledDates(props.sprint)
  const boardOpensLater = sprintBoardOpensOnStartDate(props.sprint)

  const handleActivate = async () => {
    if (props.hasActiveSprint || scheduleError) return
    setUpcomingError(null)
    setUpcomingBusy('start')
    try {
      const result = await activateSprintWithScheduledDates(props.sprint, {
        sprintStartStageId: props.sprintStartStageId,
      })
      if (!result.ok) throw new Error(result.error)
      router.refresh()
    } catch (e) {
      setUpcomingError(e instanceof Error ? e.message : 'Failed to activate sprint')
    } finally {
      setUpcomingBusy(null)
    }
  }

  const handleRejectUpcoming = async () => {
    if (!confirm(`Remove upcoming sprint "${props.sprint.name}"? Tasks will return to the product backlog.`)) return
    setUpcomingError(null)
    setUpcomingBusy('reject')
    try {
      const res = await fetch('/api/sprints', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: props.sprint.id, action: 'reject' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to remove sprint')
      router.push(
        props.processId
          ? `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/processes/${props.processId}/sprints`
          : `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/sprints`,
      )
      router.refresh()
    } catch (e) {
      setUpcomingError(e instanceof Error ? e.message : 'Failed to remove sprint')
    } finally {
      setUpcomingBusy(null)
    }
  }

  const handleCompleteSprint = async (data: {
    retrospective: { wentWell: string; improve: string; actionItems: string }
    unfinishedAction: 'backlog' | 'next_sprint'
    carryoverTargetSprintId?: string | null
    deferCarryoverToPlan?: boolean
  }) => {
    setIsCompleting(true)
    try {
      const sprintRes = await fetch('/api/sprints', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: props.sprint.id,
          action: 'close',
          unfinished_action: data.unfinishedAction,
          ...(data.unfinishedAction === 'next_sprint' && data.deferCarryoverToPlan
            ? { defer_carryover_to_plan: true }
            : {}),
          ...(data.unfinishedAction === 'next_sprint' && data.carryoverTargetSprintId
            ? { target_sprint_id: data.carryoverTargetSprintId }
            : {}),
          sprint_start_stage_id: props.sprintStartStageId,
          summary: {
            completedPoints,
            totalPoints: props.sprint.story_points_total,
            completionRate: props.sprint.story_points_total
              ? Math.round((completedPoints / props.sprint.story_points_total) * 100)
              : completedPoints > 0
                ? 100
                : 0,
            unfinishedCount: unfinishedTasks.length,
            closedAt: new Date().toISOString(),
          },
          retrospective: {
            wentWell: data.retrospective.wentWell,
            improve: data.retrospective.improve,
            actionItems: data.retrospective.actionItems,
          },
        }),
      })

      const sprintJson = await sprintRes.json()
      if (!sprintRes.ok) throw new Error(sprintJson?.error || 'Failed to complete sprint')

      const closeResult = sprintJson?.closeTasksResult as
        | {
            deferredToPlan?: boolean
            carryoverTaskIds?: string[]
            targetSprintId?: string | null
          }
        | undefined

      setIsCompleteOpen(false)

      if (closeResult?.deferredToPlan && props.planHref && closeResult.carryoverTaskIds?.length) {
        const taskQuery = closeResult.carryoverTaskIds.map(encodeURIComponent).join(',')
        router.push(`${props.planHref}?tasks=${taskQuery}&fromComplete=1`)
        router.refresh()
        return
      }

      const reviewBase = props.processId
        ? `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/processes/${props.processId}/sprints/${props.sprint.id}`
        : `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/sprints/${props.sprint.id}`

      const targetDraft = props.carryoverDraftSprints?.find((s) => s.id === closeResult?.targetSprintId)
      const carryoverQuery = targetDraft
        ? `&carryoverTarget=${encodeURIComponent(targetDraft.name)}`
        : ''

      router.push(`${reviewBase}?review=1${carryoverQuery}`)
      router.refresh()
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Failed to complete sprint')
      throw e
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Link
          href={
            props.processId
              ? `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/processes/${props.processId}/sprints`
              : `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/sprints`
          }
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Sprints
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{props.sprint.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {props.sprint.start_date && props.sprint.end_date
                ? `${props.sprint.start_date} → ${props.sprint.end_date}`
                : 'Dates not set'}
            </span>
            <span className="text-gray-300">•</span>
            <Badge variant="outline">
              {isUpcomingSprint ? 'Upcoming' : props.sprint.status === 'active' ? 'Active' : props.sprint.status}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canCompleteSprint && props.processId ? (
            <Button variant="outline" asChild>
              <Link href={`${processBoardPath(props.projectId, props.phaseId, props.processId)}?sprintId=${encodeURIComponent(props.sprint.id)}`}>
                Open board
              </Link>
            </Button>
          ) : null}
          {canCompleteSprint && props.canManageSprints ? (
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => setIsCompleteOpen(true)}
              disabled={isCompleting}
            >
              Complete Sprint
            </Button>
          ) : null}
          {isUpcomingSprint && props.canManageSprints ? (
            <>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => void handleActivate()}
                disabled={upcomingBusy !== null || props.hasActiveSprint || Boolean(scheduleError)}
                title={scheduleError ?? undefined}
              >
                {upcomingBusy === 'start' ? 'Activating…' : 'Activate sprint'}
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleRejectUpcoming()}
                disabled={upcomingBusy !== null}
              >
                {upcomingBusy === 'reject' ? 'Removing…' : 'Remove sprint'}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {isUpcomingSprint ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {scheduleError ? (
            <p>{scheduleError}</p>
          ) : (
            <p>
              This sprint uses its <span className="font-medium">planned dates</span>
              {props.sprint.start_date && props.sprint.end_date
                ? ` (${props.sprint.start_date} → ${props.sprint.end_date})`
                : ''}
              . The board and &quot;Complete sprint&quot; are available once the sprint has{' '}
              <span className="font-medium">started</span>
              {boardOpensLater && props.sprint.start_date
                ? ` (on ${props.sprint.start_date})`
                : ''}
              .
            </p>
          )}
        </div>
      ) : null}

      {upcomingError ? <p className="text-sm text-red-600">{upcomingError}</p> : null}

      {closeNotice ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {closeNotice}
        </div>
      ) : null}

      {searchParams.get('review') === '1' && props.sprint.status === 'closed' ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          Sprint completed. Completed tasks remain on this sprint for history; unfinished work was
          handled per your selection below.
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalTasks}</div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Story Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{props.sprint.story_points_total}</div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Points Done</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedPoints}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Sprint Tasks</CardTitle>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {completedTasks}/{totalTasks} done
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No tasks assigned to this sprint.</div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task.id} className="relative">
                  <BacklogTaskCard
                    task={{
                      id: task.id,
                      title: task.title,
                      description: task.description || '',
                      priority: task.priority,
                      storyPoints: task.story_points || 0,
                      assignee: null,
                      position: task.position || 0,
                    }}
                    isSelected={false}
                    onSelect={() => {}}
                    onEdit={() => setDetailTaskId(task.id)}
                    onDelete={() => {}}
                    showCheckbox={false}
                    showActions={false}
                    onOpen={() => setDetailTaskId(task.id)}
                  />
                  <div className="absolute right-4 top-4 flex items-center gap-2 pointer-events-none">
                    {isTaskDone(task) ? (
                      <div className="pointer-events-none inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Done
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {props.sprint.status === 'closed' && (props.sprint.summary || props.sprint.retrospective) ? (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Sprint Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {props.sprint.summary ? (
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Summary</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-xs text-gray-500">Completion</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {props.sprint.summary?.completedPoints ?? completedPoints}/{props.sprint.summary?.totalPoints ?? props.sprint.story_points_total}{' '}
                      pts
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-xs text-gray-500">Unfinished action</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {formatUnfinishedActionLabel(props.sprint.unfinished_action)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {props.sprint.retrospective ? (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">Retrospective</p>
                <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">What went well</p>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                      {props.sprint.retrospective?.wentWell || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">What could be improved</p>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                      {props.sprint.retrospective?.improve || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Action items</p>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                      {props.sprint.retrospective?.actionItems || '—'}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <KanbanTaskDetailModal
        taskId={detailTaskId}
        open={detailTaskId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailTaskId(null)
        }}
        onTaskSaved={() => {}}
        readOnly={taskDetailReadOnly}
      />

      {props.canManageSprints ? (
        <SprintCompletionModal
          isOpen={isCompleteOpen}
          onClose={() => setIsCompleteOpen(false)}
          onComplete={handleCompleteSprint}
          sprintData={sprintData}
          carryoverDraftSprints={props.carryoverDraftSprints}
          sprintCapacityPoints={props.sprintCapacityPoints}
        />
      ) : null}
    </div>
  )
}


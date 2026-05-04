"use client"

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'

type Stage = {
  id: string
  name: string
  stage_order: number
  is_done: boolean
  is_backlog: boolean
}

type TaskRow = {
  id: string
  title: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  story_points: number | null
  workflow_stage_id: string | null
  completed_at: string | null
  position: number | null
}

const UNASSIGNED_STAGE_ID = '__unassigned__'

function priorityBadge(priority: TaskRow['priority']) {
  switch (priority) {
    case 'critical':
      return 'bg-red-100 text-red-800 border border-red-300'
    case 'high':
      return 'bg-orange-50 text-orange-700 border border-orange-200'
    case 'medium':
      return 'bg-yellow-50 text-yellow-700 border border-yellow-100'
    case 'low':
      return 'bg-green-50 text-green-700 border border-green-100'
    default:
      return 'bg-gray-50 text-gray-700 border border-gray-100'
  }
}

function stageTaskIds(tasks: TaskRow[], stageId: string) {
  return tasks
    .filter((t) => t.workflow_stage_id === stageId)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((t) => t.id)
}

function findContainer(id: UniqueIdentifier, columns: Record<string, string[]>) {
  const sid = String(id)
  if (sid in columns) return sid
  for (const key of Object.keys(columns)) {
    if (columns[key].includes(sid)) return key
  }
  return undefined
}

async function reorderStage(
  projectId: string,
  processId: string,
  stageId: string,
  orderedTaskIds: string[]
) {
  const res = await fetch('/api/tasks/reorder-stage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, processId, stageId, orderedTaskIds }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.error || 'Failed to reorder')
}

function SortableScrumCard({
  task,
  locked,
  moving,
}: {
  task: TaskRow
  locked: boolean
  moving: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: locked || moving,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'bg-white p-4 rounded-xl border shadow-sm transition-shadow touch-none select-none',
        locked
          ? 'cursor-not-allowed opacity-95'
          : 'hover:shadow-md cursor-grab active:cursor-grabbing',
        moving ? 'opacity-60' : 'border-gray-100'
      )}
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-[11px] font-medium text-gray-400 font-mono tracking-tight">
          {task.id.slice(0, 8)}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-medium text-gray-400">{task.story_points || 0} pts</span>
        </div>
      </div>

      <h4 className="text-[13px] font-semibold text-gray-900 leading-tight mb-4">{task.title}</h4>

      <div className="flex justify-between items-end">
        <div className={cn('text-[11px] px-2 py-1 rounded-full font-bold capitalize', priorityBadge(task.priority))}>
          {task.priority}
        </div>
      </div>
    </div>
  )
}

function ScrumColumn({
  stage,
  stageTasks,
  orderedIds,
  locked,
  movingTaskId,
}: {
  stage: Stage
  stageTasks: TaskRow[]
  orderedIds: string[]
  locked: boolean
  movingTaskId: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  return (
    <div
      className={cn(
        'bg-gray-50/50 rounded-2xl p-4 border min-h-[600px] space-y-4 transition-colors border-gray-100',
        !locked && isOver && 'border-blue-300 bg-blue-50/40'
      )}
    >
      <div className="flex justify-between items-center px-1">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide select-none">{stage.name}</span>
        <span className="text-[11px] font-bold bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
          {stageTasks.length}
        </span>
      </div>

      <div ref={setNodeRef} className="space-y-4 min-h-[120px]">
        <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
          {stageTasks.map((task) => (
            <SortableScrumCard
              key={task.id}
              task={task}
              locked={locked}
              moving={movingTaskId === task.id}
            />
          ))}
        </SortableContext>
        {stageTasks.length === 0 ? (
          <div className="text-xs text-gray-400 px-2 py-8 text-center border border-dashed border-gray-200 rounded-lg select-none">
            Drop work items here
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function ScrumView(props: {
  projectId: string
  phaseId: string
  processId?: string
  sprint: { id: string; name: string; status: 'planned' | 'active' | 'closed' } | null
  stages: Stage[]
  tasks: TaskRow[]
}) {
  const router = useRouter()
  const [tasks, setTasks] = useState<TaskRow[]>(props.tasks)
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const isLocked = props.sprint?.status === 'closed'

  const stages = useMemo(() => [...props.stages].sort((a, b) => a.stage_order - b.stage_order), [props.stages])
  const stageById = useMemo(() => Object.fromEntries(stages.map((s) => [s.id, s])), [stages])

  const totalPoints = tasks.reduce((sum, t) => sum + (t.story_points || 0), 0)
  const donePoints = tasks.reduce(
    (sum, t) =>
      sum +
      ((t.completed_at || (t.workflow_stage_id ? stageById[t.workflow_stage_id]?.is_done : false))
        ? t.story_points || 0
        : 0),
    0
  )

  // If any sprint task is still in the backlog stage, show backlog as a column so tasks never "disappear".
  const isTrueBacklogStage = (s: Stage | undefined) =>
    !!s?.is_backlog && typeof s.name === 'string' && /backlog/i.test(s.name)

  const hasBacklogTasks = tasks.some((t) =>
    isTrueBacklogStage(t.workflow_stage_id ? stageById[t.workflow_stage_id] : undefined)
  )

  const hasUnassignedTasks = useMemo(
    () => tasks.some((t) => !t.workflow_stage_id || !stageById[t.workflow_stage_id]),
    [tasks, stageById]
  )

  const boardStages = useMemo(() => {
    // Only treat a stage as "Backlog" if it's flagged AND actually named backlog.
    // This avoids hiding the "To Do" column if a phase was misconfigured (or auto-healed) incorrectly.
    const base = stages.filter((s) => !isTrueBacklogStage(s) || hasBacklogTasks)
    if (!hasUnassignedTasks) return base
    const unassignedStage: Stage = {
      id: UNASSIGNED_STAGE_ID,
      name: 'Unassigned',
      stage_order: -999,
      is_done: false,
      is_backlog: false,
    }
    return [unassignedStage, ...base]
  }, [stages, hasBacklogTasks, hasUnassignedTasks])

  const columns = useMemo(() => {
    const m: Record<string, string[]> = {}
    for (const s of boardStages) {
      if (s.id === UNASSIGNED_STAGE_ID) {
        m[s.id] = tasks
          .filter((t) => !t.workflow_stage_id || !stageById[t.workflow_stage_id])
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
          .map((t) => t.id)
      } else {
        m[s.id] = stageTaskIds(tasks, s.id)
      }
    }
    return m
  }, [tasks, boardStages, stageById])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const moveTask = async (taskId: string, targetStageId: string) => {
    if (isLocked) return
    const stage = stageById[targetStageId]
    if (!stage) return

    setMovingTaskId(taskId)
    const nextCompletedAt = stage.is_done ? new Date().toISOString() : null

    // optimistic
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, workflow_stage_id: targetStageId, completed_at: nextCompletedAt } : t))
    )

    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, workflow_stage_id: targetStageId, completed_at: nextCompletedAt }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to move task')
      router.refresh()
    } catch (e) {
      console.error(e)
      router.refresh()
      alert(e instanceof Error ? e.message : 'Failed to move task')
    } finally {
      setMovingTaskId(null)
    }
  }

  const persistReorderIfPossible = useCallback(
    async (stageId: string, orderedTaskIds: string[]) => {
      if (!props.processId) return
      if (stageId === UNASSIGNED_STAGE_ID) return
      await reorderStage(props.projectId, props.processId, stageId, orderedTaskIds)
    },
    [props.processId, props.projectId]
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id)
  }, [])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)
      if (isLocked) return
      if (!over) return

      const activeTaskId = String(active.id)
      const overId = String(over.id)

      const activeContainer = findContainer(active.id, columns)
      const overContainer = findContainer(over.id, columns) ?? (overId in columns ? overId : undefined)
      if (!activeContainer || !overContainer) return

      const prev = tasks

      // Reorder in same column
      if (activeContainer === overContainer) {
        const items = [...(columns[activeContainer] ?? [])]
        const oldIndex = items.indexOf(activeTaskId)
        const overIsColumn = overId === activeContainer
        const newIndex = overIsColumn ? items.length - 1 : items.indexOf(overId)
        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return

        const nextOrder = arrayMove(items, oldIndex, newIndex)
        const next = prev.map((t) => {
          if (t.workflow_stage_id !== activeContainer) return t
          const idx = nextOrder.indexOf(t.id)
          return idx === -1 ? t : { ...t, position: idx }
        })
        setTasks(next)

        void (async () => {
          try {
            await persistReorderIfPossible(activeContainer, nextOrder)
          } catch (e) {
            console.error(e)
            setTasks(prev)
            alert(e instanceof Error ? e.message : 'Failed to reorder tasks')
          } finally {
            router.refresh()
          }
        })()

        return
      }

      // Cross-column move (place above the over card if possible, otherwise append)
      if (overContainer === UNASSIGNED_STAGE_ID) return

      const sourceIds = (columns[activeContainer] ?? []).filter((id) => id !== activeTaskId)
      let targetIds = [...(columns[overContainer] ?? [])].filter((id) => id !== activeTaskId)
      const overIsColumn = overId === overContainer
      const overIdx = overIsColumn ? -1 : targetIds.indexOf(overId)
      if (overIdx >= 0) targetIds.splice(overIdx, 0, activeTaskId)
      else targetIds.push(activeTaskId)

      const next = prev.map((t) => {
        if (t.id !== activeTaskId && t.workflow_stage_id !== activeContainer && t.workflow_stage_id !== overContainer) {
          return t
        }
        if (t.id === activeTaskId) {
          const targetStage = stageById[overContainer]
          const nextCompletedAt = targetStage?.is_done ? new Date().toISOString() : null
          return {
            ...t,
            workflow_stage_id: overContainer,
            completed_at: nextCompletedAt,
            position: targetIds.indexOf(activeTaskId),
          }
        }
        if (t.workflow_stage_id === activeContainer) {
          const idx = sourceIds.indexOf(t.id)
          return idx === -1 ? t : { ...t, position: idx }
        }
        if (t.workflow_stage_id === overContainer) {
          const idx = targetIds.indexOf(t.id)
          return idx === -1 ? t : { ...t, position: idx }
        }
        return t
      })

      setTasks(next)
      setMovingTaskId(activeTaskId)

      void (async () => {
        try {
          // Persist stage change (this endpoint already exists in your Scrum view).
          const targetStage = stageById[overContainer]
          const nextCompletedAt = targetStage?.is_done ? new Date().toISOString() : null
          const res = await fetch('/api/tasks', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: activeTaskId, workflow_stage_id: overContainer, completed_at: nextCompletedAt }),
          })
          const json = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(json?.error || 'Failed to move task')

          // Persist ordering if we have processId (required by reorder-stage API).
          if (props.processId) {
            const promises: Promise<unknown>[] = []
            if (activeContainer !== UNASSIGNED_STAGE_ID) {
              promises.push(reorderStage(props.projectId, props.processId, activeContainer, sourceIds))
            }
            promises.push(reorderStage(props.projectId, props.processId, overContainer, targetIds))
            await Promise.all(promises)
          }
        } catch (e) {
          console.error(e)
          setTasks(prev)
          alert(e instanceof Error ? e.message : 'Failed to move task')
        } finally {
          setMovingTaskId(null)
          router.refresh()
        }
      })()
    },
    [columns, isLocked, persistReorderIfPossible, props.processId, props.projectId, router, stageById, tasks]
  )

  const activeTask = activeId ? tasks.find((t) => t.id === String(activeId)) : null

  if (!props.sprint) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">No active sprint</h2>
        <p className="text-sm text-gray-600">Create a sprint from the Sprints page to start working on tasks in a Scrum board.</p>
        <div className="mt-4">
          <Button
            onClick={() =>
              router.push(
                props.processId
                  ? `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/processes/${props.processId}/sprints`
                  : `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/sprints`
              )
            }
          >
            Go to Sprints
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-100">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                ></path>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {props.sprint.status === 'active'
                ? 'Active Sprint'
                : props.sprint.status === 'planned'
                  ? 'Planned Sprint'
                  : 'Completed Sprint'}{' '}
              ({props.sprint.name})
            </h2>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                router.push(
                  props.processId
                    ? `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/processes/${props.processId}/sprints/${props.sprint!.id}`
                    : `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/sprints/${props.sprint!.id}`
                )
              }
            >
              Sprint Details
            </Button>
            {props.sprint.status !== 'closed' ? (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() =>
                  router.push(
                    props.processId
                      ? `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/processes/${props.processId}/sprints/${props.sprint!.id}?complete=1`
                      : `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/sprints/${props.sprint!.id}?complete=1`
                  )
                }
              >
                Complete Sprint
              </Button>
            ) : null}
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-1 max-w-4xl ml-16">
          Progress:{' '}
          <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            {donePoints}/{totalPoints} points completed
          </span>
          {isLocked ? <span className="ml-2 text-xs text-gray-500">(Locked)</span> : null}
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className={cn('grid grid-cols-1 md:grid-cols-4 gap-6 items-start', activeId ? 'select-none' : '')}>
          {boardStages.map((stage) => {
            const stageTasks =
              stage.id === UNASSIGNED_STAGE_ID
                ? tasks
                    .filter((t) => !t.workflow_stage_id || !stageById[t.workflow_stage_id])
                    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                : tasks
                    .filter((t) => t.workflow_stage_id === stage.id)
                    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            const ids = columns[stage.id] ?? []

            return (
              <ScrumColumn
                key={stage.id}
                stage={stage}
                stageTasks={stageTasks}
                orderedIds={ids}
                locked={isLocked}
                movingTaskId={movingTaskId}
              />
            )
          })}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-lg opacity-95 max-w-xs select-none">
              <p className="text-xs font-semibold text-gray-800">{activeTask.title}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
"use client"

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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
  workflow_stage_id: string
  completed_at: string | null
  position: number | null
}

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
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null)
  const isLocked = props.sprint?.status === 'closed'

  const stages = useMemo(() => [...props.stages].sort((a, b) => a.stage_order - b.stage_order), [props.stages])
  const stageById = useMemo(() => Object.fromEntries(stages.map((s) => [s.id, s])), [stages])

  const totalPoints = tasks.reduce((sum, t) => sum + (t.story_points || 0), 0)
  const donePoints = tasks.reduce((sum, t) => sum + ((t.completed_at || stageById[t.workflow_stage_id]?.is_done) ? (t.story_points || 0) : 0), 0)

  // If any sprint task is still in the backlog stage, show backlog as a column so tasks never "disappear".
  const isTrueBacklogStage = (s: Stage | undefined) =>
    !!s?.is_backlog && typeof s.name === 'string' && /backlog/i.test(s.name)

  const hasBacklogTasks = tasks.some((t) => isTrueBacklogStage(stageById[t.workflow_stage_id]))
  const boardStages = useMemo(() => {
    // Only treat a stage as "Backlog" if it's flagged AND actually named backlog.
    // This avoids hiding the "To Do" column if a phase was misconfigured (or auto-healed) incorrectly.
    return stages.filter((s) => !isTrueBacklogStage(s) || hasBacklogTasks)
  }, [stages, hasBacklogTasks])

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

  const handleDropToStage = (stageId: string) => {
    if (isLocked) return
    if (!draggedTaskId) return
    const current = tasks.find((t) => t.id === draggedTaskId)
    if (!current) return
    if (current.workflow_stage_id === stageId) return
    void moveTask(draggedTaskId, stageId)
  }

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {boardStages
          .map((stage) => {
            const stageTasks = tasks
              .filter((t) => t.workflow_stage_id === stage.id)
              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            return (
              <div
                key={stage.id}
                className={[
                  "bg-gray-50/50 rounded-2xl p-4 border min-h-[600px] space-y-4 transition-colors",
                  !isLocked && dragOverStageId === stage.id ? "border-blue-300 bg-blue-50/40" : "border-gray-100",
                ].join(" ")}
                onDragOver={(e) => {
                  if (isLocked) return
                  e.preventDefault()
                  if (dragOverStageId !== stage.id) setDragOverStageId(stage.id)
                }}
                onDragLeave={() => {
                  if (isLocked) return
                  if (dragOverStageId === stage.id) setDragOverStageId(null)
                }}
                onDrop={(e) => {
                  if (isLocked) return
                  e.preventDefault()
                  handleDropToStage(stage.id)
                  setDraggedTaskId(null)
                  setDragOverStageId(null)
                }}
              >
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{stage.name}</span>
                  <span className="text-[11px] font-bold bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                    {stageTasks.length}
                  </span>
                </div>

                {stageTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable={!isLocked && movingTaskId !== task.id}
                    onDragStart={(e) => {
                      if (isLocked) return
                      setDraggedTaskId(task.id)
                      e.dataTransfer.effectAllowed = "move"
                      try {
                        e.dataTransfer.setData("text/plain", task.id)
                      } catch {
                        // ignore
                      }
                    }}
                    onDragEnd={() => {
                      if (isLocked) return
                      setDraggedTaskId(null)
                      setDragOverStageId(null)
                    }}
                    className={[
                      "bg-white p-4 rounded-xl border shadow-sm transition-shadow",
                      isLocked ? "cursor-not-allowed opacity-95" : "hover:shadow-md cursor-grab active:cursor-grabbing",
                      draggedTaskId === task.id ? "opacity-60 border-blue-200" : "border-gray-100",
                    ].join(" ")}
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
                      <div className={`text-[11px] px-2 py-1 rounded-full font-bold capitalize ${priorityBadge(task.priority)}`}>
                        {task.priority}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
      </div>
    </div>
  )
}
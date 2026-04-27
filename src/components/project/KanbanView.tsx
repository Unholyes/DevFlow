"use client"

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Stage = {
  id: string
  name: string
  stage_order: number
  is_done: boolean
  is_backlog: boolean
  wip_limit?: number | null
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

function priorityStyle(priority: TaskRow['priority']) {
  const p = priority === 'critical' ? 'high' : priority
  switch (p) {
    case 'high':
      return 'bg-red-50 text-red-600 border border-red-100'
    case 'medium':
      return 'bg-yellow-50 text-yellow-600 border border-yellow-100'
    case 'low':
      return 'bg-green-50 text-green-600 border border-green-100'
    default:
      return 'bg-gray-50 text-gray-600 border border-gray-100'
  }
}

export default function KanbanView(props: { projectId: string; phaseId: string; stages: Stage[]; tasks: TaskRow[] }) {
  const router = useRouter()
  const [tasks, setTasks] = useState<TaskRow[]>(props.tasks)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null)
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null)

  const stages = useMemo(
    () => [...props.stages].filter((s) => !s.is_backlog).sort((a, b) => a.stage_order - b.stage_order),
    [props.stages]
  )
  const stageById = useMemo(() => Object.fromEntries(stages.map((s) => [s.id, s])), [stages])

  const totalTasks = tasks.length
  const inProgressCount = tasks.filter((t) => !stageById[t.workflow_stage_id]?.is_done).length
  const completedCount = tasks.filter((t) => stageById[t.workflow_stage_id]?.is_done || !!t.completed_at).length

  const moveTask = async (taskId: string, stageId: string) => {
    const stage = stageById[stageId]
    if (!stage) return

    setMovingTaskId(taskId)
    const nextCompletedAt = stage.is_done ? new Date().toISOString() : null

    // optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, workflow_stage_id: stageId, completed_at: nextCompletedAt } : t))
    )

    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, workflow_stage_id: stageId, completed_at: nextCompletedAt }),
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks', value: String(totalTasks), color: 'text-gray-900' },
          { label: 'In Progress', value: String(inProgressCount), color: 'text-blue-600' },
          { label: 'Completed', value: String(completedCount), color: 'text-green-600' },
          { label: 'Method', value: 'Kanban', color: 'text-gray-900' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-xs font-medium text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <Card className="border-gray-100 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Kanban Board</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Drag cards between columns (WIP limits enforced by DB).</p>
          </div>
          <Button variant="outline" onClick={() => router.refresh()}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {stages.length === 0 ? (
            <div className="text-sm text-gray-600">No workflow stages configured for this phase.</div>
          ) : (
            <div className="flex gap-6 overflow-x-auto pb-6">
              {stages.map((stage) => {
                const stageTasks = tasks
                  .filter((t) => t.workflow_stage_id === stage.id)
                  .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

                const wipLabel =
                  stage.wip_limit != null ? `${stageTasks.filter((t) => !t.completed_at).length}/${stage.wip_limit}` : null

                return (
                  <div key={stage.id} className="min-w-[320px] flex flex-col gap-4">
                    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
                      <div>
                        <span className="font-bold text-gray-800 text-sm">{stage.name}</span>
                        <span className="ml-2 text-xs text-gray-400 font-medium">{stageTasks.length} tasks</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {wipLabel ? (
                          <span className="text-[10px] font-bold bg-green-50 text-green-600 px-2 py-0.5 rounded border border-green-100 uppercase">
                            WIP: {wipLabel}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-gray-50 text-gray-500 px-2 py-0.5 rounded border border-gray-100 uppercase">
                            No WIP
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      className={`flex-1 space-y-4 overflow-y-auto pr-2 ${dragOverStageId === stage.id ? 'bg-blue-50 rounded-lg' : ''}`}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setDragOverStageId(stage.id)
                      }}
                      onDragLeave={() => setDragOverStageId(null)}
                      onDrop={() => {
                        if (!draggedTaskId) return
                        if (movingTaskId) return
                        moveTask(draggedTaskId, stage.id)
                        setDraggedTaskId(null)
                        setDragOverStageId(null)
                      }}
                    >
                      {stageTasks.map((task) => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={() => setDraggedTaskId(task.id)}
                          className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">{task.id.slice(0, 8)}</span>
                            <Badge variant="outline" className={`text-[10px] font-bold ${priorityStyle(task.priority)}`}>
                              {task.priority === 'critical' ? 'high' : task.priority}
                            </Badge>
                          </div>

                          <h4 className="text-sm font-bold text-gray-800 mb-3 leading-snug">{task.title}</h4>

                          <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                            <span className="text-[10px] text-gray-500 font-medium">
                              {task.story_points || 0} pts
                            </span>
                            <div className="flex items-center gap-2">
                              <select
                                value={task.workflow_stage_id}
                                onChange={(e) => moveTask(task.id, e.target.value)}
                                disabled={movingTaskId === task.id}
                                className="text-[11px] border border-gray-200 rounded px-2 py-1 bg-white"
                              >
                                {stages.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}

                      {stageTasks.length === 0 ? (
                        <div className="text-xs text-gray-400 px-2 py-4">Drop tasks here</div>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

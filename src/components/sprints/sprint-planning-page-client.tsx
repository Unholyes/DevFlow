'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, ArrowLeft, Save, Play, Target, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BacklogTaskCard } from '@/components/project/backlog-task-card'

type Task = {
  id: string
  title: string
  description: string | null
  priority: 'high' | 'medium' | 'low' | 'critical'
  story_points: number | null
  assignee_id: string | null
  position: number | null
}

const defaultCapacity = 42

function normalizePriority(p: Task['priority']): 'low' | 'medium' | 'high' {
  return p === 'critical' ? 'high' : p
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const map = new Map<string, T>()
  for (const item of items) map.set(item.id, item)
  return Array.from(map.values())
}

export function SprintPlanningPageClient(props: {
  projectId: string
  phaseId: string
  processId?: string
  initialCapacityPoints?: number
  backlogStageId?: string
  sprintStartStageId?: string
  backlogTasks: Task[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [capacityPoints, setCapacityPoints] = useState<number>(() => {
    const n = props.initialCapacityPoints
    return Number.isFinite(n) && (n as number) > 0 ? Math.floor(n as number) : defaultCapacity
  })
  const [savingCapacity, setSavingCapacity] = useState(false)
  const [capacitySaveError, setCapacitySaveError] = useState<string | null>(null)

  const [isCreating, setIsCreating] = useState(false)
  const [createTitle, setCreateTitle] = useState('')
  const [createPriority, setCreatePriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
  const [createStoryPoints, setCreateStoryPoints] = useState<string>('0')
  const [createLoading, setCreateLoading] = useState(false)

  const [sprintName, setSprintName] = useState('Sprint 1')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [backlogTasks, setBacklogTasks] = useState<Task[]>(props.backlogTasks)
  const [sprintTasks, setSprintTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const tasksParam = searchParams.get('tasks')
    if (tasksParam) setSelectedTasks(new Set(tasksParam.split(',')))
  }, [searchParams])

  const selectedTaskObjects = useMemo(
    () => backlogTasks.filter((t) => selectedTasks.has(t.id)),
    [backlogTasks, selectedTasks]
  )
  const selectedStoryPoints = selectedTaskObjects.reduce((sum, t) => sum + (t.story_points || 0), 0)
  const remainingBacklog = backlogTasks.filter((t) => !selectedTasks.has(t.id))

  const capacity = Math.max(1, capacityPoints || defaultCapacity)
  const sprintBacklogStoryPoints = sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0)
  const capacityStatus =
    sprintBacklogStoryPoints > capacity
      ? 'over'
      : sprintBacklogStoryPoints < capacity * 0.8
        ? 'under'
        : 'optimal'

  useEffect(() => {
    if (!props.processId) return
    setCapacitySaveError(null)

    const handle = window.setTimeout(async () => {
      setSavingCapacity(true)
      try {
        const res = await fetch('/api/phase-processes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: props.processId, sprint_capacity_points: capacity }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Failed to save capacity')
      } catch (e) {
        setCapacitySaveError(e instanceof Error ? e.message : 'Failed to save capacity')
      } finally {
        setSavingCapacity(false)
      }
    }, 450)

    return () => window.clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capacity, props.processId])

  const canCreate = !!props.processId && !!props.backlogStageId

  const handleCreateTask = async () => {
    if (!canCreate) return
    const title = createTitle.trim()
    if (!title) return

    const storyPoints = Number(createStoryPoints)
    const safeStoryPoints = Number.isFinite(storyPoints) && storyPoints >= 0 ? Math.floor(storyPoints) : 0

    setCreateLoading(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: props.projectId,
          process_id: props.processId,
          workflow_stage_id: props.backlogStageId,
          title,
          priority: createPriority,
          story_points: safeStoryPoints,
          description: null,
          sprint_id: null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to create task')

      const created = json?.data as Partial<Task> | undefined
      if (created?.id) {
        setBacklogTasks((prev) => [
          {
            id: String(created.id),
            title: String(created.title ?? title),
            description: (created.description ?? null) as any,
            priority: (created.priority ?? createPriority) as any,
            story_points: (created.story_points ?? safeStoryPoints) as any,
            assignee_id: (created.assignee_id ?? null) as any,
            position: (created.position ?? null) as any,
          } as Task,
          ...prev.filter((t) => t.id !== created.id),
        ])
      }

      setCreateTitle('')
      setCreatePriority('medium')
      setCreateStoryPoints('0')
      setIsCreating(false)
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create task')
    } finally {
      setCreateLoading(false)
    }
  }

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  const handleAddToSprint = () => {
    const tasksToAdd = backlogTasks.filter((t) => selectedTasks.has(t.id))
    setSprintTasks((prev) => uniqueById([...prev, ...tasksToAdd]))
    // Remove the added tasks from backlog (even if there were duplicates).
    setBacklogTasks((prev) => prev.filter((t) => !selectedTasks.has(t.id)))
    setSelectedTasks(new Set())
  }

  const handleRemoveFromSprint = (taskId: string) => {
    // Move task back to backlog (no duplicates).
    setSprintTasks((prevSprint) => {
      const taskToMove = prevSprint.find((t) => t.id === taskId)
      if (!taskToMove) return prevSprint

      setBacklogTasks((prevBacklog) => uniqueById([...prevBacklog, taskToMove]))
      setSelectedTasks((prevSelected) => {
        if (!prevSelected.has(taskId)) return prevSelected
        const next = new Set(prevSelected)
        next.delete(taskId)
        return next
      })

      return prevSprint.filter((t) => t.id !== taskId)
    })
  }

  const handleStartSprint = async () => {
    if (!sprintName || !startDate || !endDate) {
      alert('Please fill in all sprint details')
      return
    }

    if (sprintTasks.length === 0) {
      alert('Please add at least one task to the sprint')
      return
    }

    setLoading(true)
    try {
      const createRes = await fetch('/api/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: props.projectId,
          phase_id: props.phaseId,
          process_id: props.processId,
          name: sprintName,
          start_date: startDate,
          end_date: endDate,
          story_points_total: sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0),
          status: 'active',
        }),
      })

      const created = await createRes.json()
      if (!createRes.ok) throw new Error(created?.error || 'Failed to create sprint')

      const sprintId = created?.data?.id as string | undefined
      if (!sprintId) throw new Error('Failed to create sprint (missing id)')

      await Promise.all(
        sprintTasks.map((t) =>
          fetch('/api/tasks', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: t.id,
              sprint_id: sprintId,
              // Ensure sprint tasks show on the Scrum board by moving them out of the backlog stage.
              ...(props.sprintStartStageId ? { workflow_stage_id: props.sprintStartStageId } : {}),
            }),
          })
        )
      )

      // After starting a sprint, drop users into the Scrum board for that sprint.
      if (props.processId) {
        router.push(
          `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/processes/${props.processId}/board?sprintId=${encodeURIComponent(
            sprintId
          )}`
        )
      } else {
        router.push(`/dashboard/projects/${props.projectId}/phases/${props.phaseId}/sprints`)
      }
      router.refresh()
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Failed to start sprint')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDraft = () => {
    alert('Draft saving will be implemented next.')
  }

  if (loading) {
    return <div className="flex justify-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Link
          href={`/dashboard/projects/${props.projectId}/phases/${props.phaseId}`}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Phase Overview
        </Link>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sprint Planning</h1>
          <p className="text-gray-600 mt-1">Select tasks from backlog and plan your sprint</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveDraft}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={handleStartSprint}
            disabled={!sprintName || !startDate || !endDate || sprintTasks.length === 0}
          >
            <Play className="h-4 w-4 mr-2" />
            Start Sprint
          </Button>
        </div>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Sprint Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sprint Name</label>
              <Input value={sprintName} onChange={(e) => setSprintName(e.target.value)} placeholder="Sprint 1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card
        className={`border-2 shadow-sm ${
          capacityStatus === 'over'
            ? 'border-red-200 bg-red-50/30'
            : capacityStatus === 'under'
              ? 'border-yellow-200 bg-yellow-50/30'
              : 'border-green-200 bg-green-50/30'
        }`}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`p-3 rounded-lg ${
                  capacityStatus === 'over'
                    ? 'bg-red-100'
                    : capacityStatus === 'under'
                      ? 'bg-yellow-100'
                      : 'bg-green-100'
                }`}
              >
                <Target
                  className={`h-6 w-6 ${
                    capacityStatus === 'over'
                      ? 'text-red-600'
                      : capacityStatus === 'under'
                        ? 'text-yellow-600'
                        : 'text-green-600'
                  }`}
                />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Sprint Capacity</h3>
                <p className="text-sm text-gray-600">
                  {sprintBacklogStoryPoints} / {capacity} story points
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge
                className={
                  capacityStatus === 'over'
                    ? 'bg-red-100 text-red-700'
                    : capacityStatus === 'under'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                }
              >
                {capacityStatus === 'over' ? 'Over Capacity' : capacityStatus === 'under' ? 'Under Capacity' : 'Optimal'}
              </Badge>
              <div className="mt-2 flex items-center justify-end gap-2">
                <label className="text-xs text-gray-600">Capacity</label>
                <div className="inline-flex items-center rounded-md border border-gray-200 bg-white overflow-hidden">
                  <button
                    type="button"
                    className="h-8 w-8 grid place-items-center text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    onClick={() => setCapacityPoints((v) => Math.max(1, (v || defaultCapacity) - 1))}
                    disabled={savingCapacity}
                    aria-label="Decrease capacity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="h-8 min-w-[56px] px-3 grid place-items-center text-xs font-semibold text-gray-900">
                    {capacity}
                  </div>
                  <button
                    type="button"
                    className="h-8 w-8 grid place-items-center text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    onClick={() => setCapacityPoints((v) => Math.max(1, (v || defaultCapacity) + 1))}
                    disabled={savingCapacity}
                    aria-label="Increase capacity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {savingCapacity ? 'Saving…' : capacitySaveError ? capacitySaveError : 'Saved per process'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Product Backlog</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{remainingBacklog.length} tasks</Badge>
                <Button
                  size="sm"
                  variant={isCreating ? 'default' : 'outline'}
                  disabled={!canCreate}
                  onClick={() => setIsCreating((v) => !v)}
                  title={canCreate ? 'Create a new backlog task' : 'Backlog stage / process not resolved yet'}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isCreating ? (
              <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-7">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <Input
                      placeholder="e.g. Create API contract"
                      value={createTitle}
                      onChange={(e) => setCreateTitle(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 text-sm"
                      value={createPriority}
                      onChange={(e) => setCreatePriority(e.target.value as any)}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Story points</label>
                    <Input
                      inputMode="numeric"
                      value={createStoryPoints}
                      onChange={(e) => setCreateStoryPoints(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-12 flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setIsCreating(false)} disabled={createLoading}>
                      Cancel
                    </Button>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={handleCreateTask}
                      disabled={createLoading || !createTitle.trim()}
                    >
                      {createLoading ? 'Creating…' : 'Create task'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {remainingBacklog.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>All tasks selected for sprint</p>
              </div>
            ) : (
              <div className="space-y-3">
                {remainingBacklog.map((task) => (
                  <BacklogTaskCard
                    key={task.id}
                    task={{
                      id: task.id,
                      title: task.title,
                      description: task.description || '',
                      priority: normalizePriority(task.priority),
                      storyPoints: task.story_points || 0,
                      assignee: null,
                      position: task.position || 0,
                    }}
                    isSelected={selectedTasks.has(task.id)}
                    onSelect={() => toggleTaskSelection(task.id)}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                ))}
              </div>
            )}
            {selectedTasks.size > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button onClick={handleAddToSprint} className="w-full" disabled={selectedTasks.size === 0}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Add {selectedTasks.size} tasks to Sprint
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Sprint Backlog</CardTitle>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {sprintTasks.length} tasks ({sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0)} pts)
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {sprintTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No tasks in sprint yet</p>
                <p className="text-sm mt-1">Select tasks from backlog to add</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sprintTasks.map((task) => (
                  <BacklogTaskCard
                    key={task.id}
                    task={{
                      id: task.id,
                      title: task.title,
                      description: task.description || '',
                      priority: normalizePriority(task.priority),
                      storyPoints: task.story_points || 0,
                      assignee: null,
                      position: task.position || 0,
                    }}
                    isSelected={false}
                    onSelect={() => {}}
                    onEdit={() => {}}
                    onDelete={() => handleRemoveFromSprint(task.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


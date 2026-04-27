'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, ArrowLeft, Save, Play, Target } from 'lucide-react'
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

const historicalVelocity = 42

function normalizePriority(p: Task['priority']): 'low' | 'medium' | 'high' {
  return p === 'critical' ? 'high' : p
}

export function SprintPlanningPageClient(props: { projectId: string; phaseId: string; backlogTasks: Task[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()

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
  const totalStoryPoints = selectedTaskObjects.reduce((sum, t) => sum + (t.story_points || 0), 0)
  const remainingBacklog = backlogTasks.filter((t) => !selectedTasks.has(t.id))

  const capacityStatus =
    totalStoryPoints > historicalVelocity
      ? 'over'
      : totalStoryPoints < historicalVelocity * 0.8
        ? 'under'
        : 'optimal'

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
    setSprintTasks((prev) => [...prev, ...tasksToAdd])
    setBacklogTasks(remainingBacklog)
    setSelectedTasks(new Set())
  }

  const handleRemoveFromSprint = (taskId: string) => {
    setSprintTasks((prev) => {
      const taskToRemove = prev.find((t) => t.id === taskId)
      if (!taskToRemove) return prev
      setBacklogTasks((b) => [...b, taskToRemove])
      return prev.filter((t) => t.id !== taskId)
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
            body: JSON.stringify({ id: t.id, sprint_id: sprintId }),
          })
        )
      )

      router.push(`/dashboard/projects/${props.projectId}/phases/${props.phaseId}/sprints`)
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
                  {totalStoryPoints} / {historicalVelocity} story points
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
              <p className="text-xs text-gray-500 mt-1">Based on historical velocity</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Product Backlog</CardTitle>
              <Badge variant="outline">{remainingBacklog.length} tasks</Badge>
            </div>
          </CardHeader>
          <CardContent>
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


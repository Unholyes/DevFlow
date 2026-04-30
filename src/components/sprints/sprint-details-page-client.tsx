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
import { SprintCompletionModal } from '@/components/project/sprint-completion-modal'

type Sprint = {
  id: string
  name: string
  start_date: string
  end_date: string
  status: 'planned' | 'active' | 'closed'
  story_points_total: number
}

type Task = {
  id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'critical'
  story_points: number | null
  completed_at: string | null
  position: number | null
}

function normalizePriority(p: Task['priority']): 'low' | 'medium' | 'high' {
  return p === 'critical' ? 'high' : p
}

export function SprintDetailsPageClient(props: {
  projectId: string
  phaseId: string
  processId?: string
  backlogStageId?: string
  sprintStartStageId?: string
  sprint: Sprint
  tasks: Task[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isCompleteOpen, setIsCompleteOpen] = useState(false)
  useEffect(() => {
    const shouldOpen = searchParams.get('complete') === '1'
    if (shouldOpen) setIsCompleteOpen(true)
  }, [searchParams])
  const [isCompleting, setIsCompleting] = useState(false)
  const [tasks, setTasks] = useState<Task[]>(props.tasks)

  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => !!t.completed_at).length
  const completedPoints = tasks.reduce((sum, t) => sum + (t.completed_at ? t.story_points || 0 : 0), 0)

  const unfinishedTasks = useMemo(
    () => tasks.filter((t) => !t.completed_at),
    [tasks]
  )

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

  const handleCompleteSprint = async (data: { retrospective: string; unfinishedAction: 'backlog' | 'next_sprint' }) => {
    setIsCompleting(true)
    try {
      const sprintRes = await fetch('/api/sprints', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: props.sprint.id, status: 'closed' }),
      })

      const sprintJson = await sprintRes.json()
      if (!sprintRes.ok) throw new Error(sprintJson?.error || 'Failed to complete sprint')

      if (data.unfinishedAction === 'next_sprint' && unfinishedTasks.length > 0) {
        const today = new Date()
        const start = today.toISOString().slice(0, 10)
        const end = new Date(today.getTime() + 13 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

        const nextName = `${props.sprint.name} (Next)`

        const createRes = await fetch('/api/sprints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: props.projectId,
            phase_id: props.phaseId,
            name: nextName,
            start_date: start,
            end_date: end,
            status: 'planned',
            story_points_total: unfinishedTasks.reduce((sum, t) => sum + (t.story_points || 0), 0),
          }),
        })

        const created = await createRes.json()
        if (!createRes.ok) throw new Error(created?.error || 'Failed to create next sprint')
        const nextSprintId = created?.data?.id as string | undefined
        if (!nextSprintId) throw new Error('Failed to create next sprint (missing id)')

        await Promise.all(
          unfinishedTasks.map((t) =>
            fetch('/api/tasks', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: t.id,
                sprint_id: nextSprintId,
                ...(props.sprintStartStageId ? { workflow_stage_id: props.sprintStartStageId } : {}),
              }),
            })
          )
        )
      } else {
        // Default: return unfinished tasks back to backlog by clearing sprint_id.
        await Promise.all(
          unfinishedTasks.map((t) =>
            fetch('/api/tasks', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: t.id,
                sprint_id: null,
                ...(props.backlogStageId ? { workflow_stage_id: props.backlogStageId } : {}),
              }),
            })
          )
        )
      }

      setIsCompleteOpen(false)
      router.push(
        props.processId
          ? `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/processes/${props.processId}/sprints`
          : `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/sprints`
      )
      router.refresh()
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Failed to complete sprint')
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
              {props.sprint.start_date} → {props.sprint.end_date}
            </span>
            <span className="text-gray-300">•</span>
            <Badge variant="outline">{props.sprint.status}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={() => setIsCompleteOpen(true)}
            disabled={props.sprint.status === 'closed' || isCompleting}
          >
            Complete Sprint
          </Button>
        </div>
      </div>

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
                      priority: normalizePriority(task.priority),
                      storyPoints: task.story_points || 0,
                      assignee: null,
                      position: task.position || 0,
                    }}
                    isSelected={false}
                    onSelect={() => {}}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    showCheckbox={false}
                    showActions={false}
                  />
                  <div className="absolute right-4 top-4 flex items-center gap-2">
                    {task.completed_at ? (
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

      <SprintCompletionModal
        isOpen={isCompleteOpen}
        onClose={() => setIsCompleteOpen(false)}
        onComplete={handleCompleteSprint}
        sprintData={sprintData}
      />
    </div>
  )
}


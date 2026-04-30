'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type BacklogTask = {
  id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'critical'
  story_points: number | null
  assignee_id: string | null
  position: number | null
}

export function ProductBacklogPageClient(props: {
  projectId: string
  phaseId: string
  processId?: string
  backlogStageId?: string
  phaseTitle: string
  tasks: BacklogTask[]
}) {
  const router = useRouter()
  const [tasks, setTasks] = useState<BacklogTask[]>(props.tasks)
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low' | 'critical'>('all')
  const [isCreating, setIsCreating] = useState(false)
  const [createTitle, setCreateTitle] = useState('')
  const [createPriority, setCreatePriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
  const [createStoryPoints, setCreateStoryPoints] = useState<string>('0')
  const [createLoading, setCreateLoading] = useState(false)

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        (task.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (task.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      const matchesFilter = filterPriority === 'all' || task.priority === filterPriority
      return matchesSearch && matchesFilter
    })
  }, [tasks, searchQuery, filterPriority])

  const totalStoryPoints = filteredTasks.reduce((sum, task) => sum + (task.story_points || 0), 0)

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  const handleSelectAll = () => {
    setSelectedTasks((prev) => {
      if (prev.size === filteredTasks.length) return new Set()
      return new Set(filteredTasks.map((t) => t.id))
    })
  }

  const handleAddToSprint = () => {
    if (selectedTasks.size === 0) return
    router.push(
      props.processId
        ? `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/processes/${props.processId}/sprints/plan?tasks=${Array.from(selectedTasks).join(',')}`
        : `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/sprints/plan?tasks=${Array.from(selectedTasks).join(',')}`
    )
  }

  const canCreate = !!props.backlogStageId && !!props.processId

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

      const created = json?.data as Partial<BacklogTask> | undefined
      if (created?.id) {
        setTasks((prev) => [
          {
            id: String(created.id),
            title: String(created.title ?? title),
            description: (created.description ?? null) as any,
            priority: (created.priority ?? createPriority) as any,
            story_points: (created.story_points ?? safeStoryPoints) as any,
            assignee_id: (created.assignee_id ?? null) as any,
            position: (created.position ?? null) as any,
          },
          ...prev.filter((t) => t.id !== created.id),
        ])
      }

      setCreateTitle('')
      setCreatePriority('medium')
      setCreateStoryPoints('0')
      setIsCreating(false)
      router.refresh() // keep as safety net for server-rendered state
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create task')
    } finally {
      setCreateLoading(false)
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Product Backlog</h1>
          <p className="text-gray-600 mt-1">Backlog items for “{props.phaseTitle}” (Scrum)</p>
        </div>
        <div className="flex gap-2">
          {selectedTasks.size > 0 && (
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAddToSprint}>
              <Plus className="h-4 w-4 mr-2" />
              Add {selectedTasks.size} tasks to Sprint
            </Button>
          )}
          <Button
            disabled={!canCreate}
            title={canCreate ? 'Create a new backlog task' : 'Backlog stage / process not resolved yet'}
            onClick={() => setIsCreating((v) => !v)}
            variant={isCreating ? 'default' : 'outline'}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Button>
        </div>
      </div>

      {isCreating ? (
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-7">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <Input
                  placeholder="e.g. Implement login validation"
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
              <div className="md:col-span-12 flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setIsCreating(false)} disabled={createLoading}>
                  Cancel
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleCreateTask}
                  disabled={createLoading || !createTitle.trim()}
                >
                  {createLoading ? 'Creating…' : 'Create'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{filteredTasks.length}</div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Story Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalStoryPoints}</div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{selectedTasks.size}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'high', 'medium', 'low', 'critical'] as const).map((p) => (
                <Button
                  key={p}
                  variant={filterPriority === p ? 'default' : 'outline'}
                  onClick={() => setFilterPriority(p)}
                  size="sm"
                >
                  {p === 'all' ? 'All' : p[0].toUpperCase() + p.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Backlog Items</CardTitle>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                  onChange={handleSelectAll}
                  className="rounded"
                />
                Select All
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No tasks found in backlog</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start justify-between rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedTasks.has(task.id)}
                        onChange={() => toggleTaskSelection(task.id)}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{task.title}</p>
                        {task.description ? (
                          <p className="text-sm text-gray-500 line-clamp-1">{task.description}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        Priority: {task.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {task.story_points || 0} pts
                      </Badge>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">{task.position ?? 0}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


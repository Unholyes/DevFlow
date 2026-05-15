'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Search, ArrowLeft, LayoutGrid, GripVertical, Trash2, ArrowRightCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { KanbanTaskDetailModal, type TaskRowLite } from '@/components/project/KanbanTaskDetailModal'

type BacklogTask = {
  id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'critical'
  story_points: number | null
  assignee_id: string | null
  position: number | null
  team_id?: string | null
  workflow_stage_id?: string
  size_band?: 'xs' | 's' | 'm' | 'l' | 'xl' | null
  service_class?: 'standard' | 'fixed_date' | 'expedite' | null
}

const CARD_CLICK_MAX_MOVE_PX = 12

function priorityStyle(priority: BacklogTask['priority']) {
  const p = priority === 'critical' ? 'high' : priority
  switch (p) {
    case 'high':
      return 'bg-red-50 text-red-600 border-red-100'
    case 'medium':
      return 'bg-yellow-50 text-yellow-600 border-yellow-100'
    case 'low':
      return 'bg-green-50 text-green-600 border-green-100'
    default:
      return 'bg-gray-50 text-gray-600 border-gray-100'
  }
}

function serviceClassLabel(svc: BacklogTask['service_class']) {
  if (svc === 'expedite') return 'Expedite'
  if (svc === 'fixed_date') return 'Fixed date'
  return null
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

async function patchTask(body: Record<string, unknown>) {
  const res = await fetch('/api/tasks', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.error || 'Failed to update task')
}

async function deleteTask(id: string) {
  const res = await fetch(`/api/tasks?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.error || 'Failed to delete task')
}

function SortableBacklogRow({
  task,
  queueIndex,
  isKanban,
  teamsList,
  assigneeNames,
  selected,
  canReorder,
  onToggleSelect,
  onOpen,
  showSelection,
}: {
  task: BacklogTask
  queueIndex: number
  isKanban: boolean
  teamsList: { id: string; name: string }[]
  assigneeNames: Record<string, string>
  selected: boolean
  canReorder: boolean
  onToggleSelect: (id: string) => void
  onOpen: (task: BacklogTask) => void
  showSelection: boolean
}) {
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !canReorder,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const refined = (task.description?.trim()?.length ?? 0) > 0
  const teamName = task.team_id ? teamsList.find((x) => x.id === task.team_id)?.name : null
  const assigneeName = task.assignee_id ? assigneeNames[task.assignee_id] : null
  const svcLabel = serviceClassLabel(task.service_class)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-start justify-between rounded-lg border border-gray-200 bg-white p-4 transition-shadow',
        'hover:border-gray-300 hover:shadow-sm',
        isDragging && 'shadow-md ring-2 ring-blue-100',
        selected && 'border-blue-200 bg-blue-50/30'
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {canReorder ? (
          <button
            type="button"
            className="mt-0.5 shrink-0 cursor-grab touch-none text-gray-400 hover:text-gray-600 active:cursor-grabbing"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>
        ) : null}
        {showSelection ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(task.id)}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 rounded"
            aria-label={`Select ${task.title}`}
          />
        ) : null}
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onPointerDown={(e) => {
            pointerStartRef.current = { x: e.clientX, y: e.clientY }
          }}
          onClick={(e) => {
            const start = pointerStartRef.current
            pointerStartRef.current = null
            if (start) {
              const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y)
              if (moved > CARD_CLICK_MAX_MOVE_PX) return
            }
            onOpen(task)
          }}
          onKeyDown={(e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onOpen(task)
            }
          }}
        >
          <p className="font-medium text-gray-900 truncate">{task.title}</p>
          {task.description?.trim() ? (
            <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{task.description}</p>
          ) : isKanban ? (
            <p className="text-sm text-gray-400 italic mt-0.5">
              No description yet — add one when you refine this item.
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
            <Badge variant="outline" className={cn('text-xs capitalize', priorityStyle(task.priority))}>
              {task.priority}
            </Badge>
            {teamName ? (
              <Badge variant="outline" className="text-xs text-gray-700">
                {teamName}
              </Badge>
            ) : null}
            {assigneeName ? (
              <Badge variant="outline" className="text-xs text-gray-600">
                {assigneeName}
              </Badge>
            ) : null}
            {isKanban && task.size_band ? (
              <Badge variant="outline" className="text-xs uppercase font-semibold">
                {task.size_band}
              </Badge>
            ) : null}
            {isKanban && svcLabel ? (
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  task.service_class === 'expedite' && 'text-red-700 border-red-100',
                  task.service_class === 'fixed_date' && 'text-amber-700 border-amber-100'
                )}
              >
                {svcLabel}
              </Badge>
            ) : null}
            {isKanban ? (
              refined ? (
                <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-100 bg-emerald-50">
                  Refined
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-amber-700 border-amber-100 bg-amber-50">
                  Needs refinement
                </Badge>
              )
            ) : (
              <Badge variant="outline" className="text-xs">
                {task.story_points || 0} pts
              </Badge>
            )}
          </div>
          <p className="text-xs text-blue-600 mt-2 font-medium">View details</p>
        </button>
      </div>
      <div
        className="ml-3 shrink-0 text-right"
        title="Order in the backlog queue (top = pull first)"
      >
        <span className="text-[10px] uppercase tracking-wide text-gray-400">Queue</span>
        <p className="text-sm font-semibold text-gray-500">#{queueIndex + 1}</p>
      </div>
    </div>
  )
}

export function ProductBacklogPageClient(props: {
  projectId: string
  phaseId: string
  processId?: string
  backlogStageId?: string
  phaseTitle: string
  methodology?: 'scrum' | 'kanban'
  teams?: { id: string; name: string }[]
  tasks: BacklogTask[]
  pullStageId?: string | null
  pullStageName?: string | null
  assigneeNames?: Record<string, string>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const teamsList = props.teams ?? []
  const assigneeNames = props.assigneeNames ?? {}

  const [tasks, setTasks] = useState<BacklogTask[]>(props.tasks)
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low' | 'critical'>('all')
  const [isCreating, setIsCreating] = useState(false)
  const [createTitle, setCreateTitle] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createPriority, setCreatePriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
  const [createStoryPoints, setCreateStoryPoints] = useState<string>('0')
  const [createTeamId, setCreateTeamId] = useState<string>('')
  const [createSizeBand, setCreateSizeBand] = useState('')
  const [createServiceClass, setCreateServiceClass] = useState('standard')
  const [createLoading, setCreateLoading] = useState(false)
  const [bulkPriority, setBulkPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)

  useEffect(() => {
    setTasks(props.tasks)
  }, [props.tasks])

  const teamFilterId = (searchParams.get('teamId') ?? '').trim()
  const teamFilterActive = teamFilterId.length > 0

  const setTeamFilter = useCallback(
    (id: string) => {
      const p = new URLSearchParams(searchParams.toString())
      if (!id) p.delete('teamId')
      else p.set('teamId', id)
      const q = p.toString()
      router.push(q ? `${pathname}?${q}` : pathname)
    },
    [pathname, router, searchParams]
  )

  const isKanban = props.methodology === 'kanban'
  const boardHref =
    props.processId
      ? `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/processes/${props.processId}/board`
      : null

  const filtersActive =
    searchQuery.trim().length > 0 || filterPriority !== 'all' || teamFilterActive

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        (task.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (task.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      const matchesFilter = filterPriority === 'all' || task.priority === filterPriority
      const matchesTeam = !teamFilterActive || task.team_id === teamFilterId
      return matchesSearch && matchesFilter && matchesTeam
    })
  }, [tasks, searchQuery, filterPriority, teamFilterActive, teamFilterId])

  const sortedTasks = useMemo(
    () => [...filteredTasks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [filteredTasks]
  )

  const totalStoryPoints = filteredTasks.reduce((sum, task) => sum + (task.story_points || 0), 0)
  const kanbanDetailedCount = filteredTasks.filter((t) => (t.description?.trim()?.length ?? 0) > 0).length
  const kanbanUnrefinedCount = filteredTasks.length - kanbanDetailedCount

  const queueIndexByTaskId = useMemo(() => {
    const ordered = [...tasks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    return Object.fromEntries(ordered.map((t, i) => [t.id, i]))
  }, [tasks])

  const canReorder =
    !filtersActive &&
    !!props.processId &&
    !!props.backlogStageId &&
    !reordering &&
    !bulkLoading

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

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

  const clearSelection = () => setSelectedTasks(new Set())

  const handleAddToSprint = () => {
    if (selectedTasks.size === 0) return
    router.push(
      props.processId
        ? `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/processes/${props.processId}/sprints/plan?tasks=${Array.from(selectedTasks).join(',')}`
        : `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/sprints/plan?tasks=${Array.from(selectedTasks).join(',')}`
    )
  }

  const openTaskDetail = useCallback((task: BacklogTask) => {
    setDetailTaskId(task.id)
  }, [])

  const handleDetailSaved = useCallback(
    (row: TaskRowLite) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === row.id
            ? {
                ...t,
                title: row.title,
                description: row.description ?? null,
                priority: row.priority,
                story_points: row.story_points,
                assignee_id: row.assignee_id ?? t.assignee_id,
                team_id: row.team_id ?? t.team_id,
                size_band: row.size_band ?? t.size_band,
                service_class: row.service_class ?? t.service_class,
                workflow_stage_id: row.workflow_stage_id,
              }
            : t
        )
      )
      if (props.backlogStageId && row.workflow_stage_id !== props.backlogStageId) {
        setTasks((prev) => prev.filter((t) => t.id !== row.id))
        setSelectedTasks((prev) => {
          const next = new Set(prev)
          next.delete(row.id)
          return next
        })
      }
      router.refresh()
    },
    [props.backlogStageId, router]
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    if (!props.processId || !props.backlogStageId) return

    const ids = tasks
      .filter((t) => t.workflow_stage_id === props.backlogStageId || !t.workflow_stage_id)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((t) => t.id)

    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return

    const nextIds = arrayMove(ids, oldIndex, newIndex)
    const prevTasks = tasks
    setTasks((prev) => {
      const byId = Object.fromEntries(prev.map((t) => [t.id, t]))
      return nextIds.map((id, i) => ({ ...byId[id], position: i }))
    })

    setReordering(true)
    try {
      await reorderStage(props.projectId, props.processId, props.backlogStageId, nextIds)
      router.refresh()
    } catch (e) {
      setTasks(prevTasks)
      alert(e instanceof Error ? e.message : 'Failed to reorder')
    } finally {
      setReordering(false)
    }
  }

  const runBulk = async (fn: () => Promise<void>) => {
    if (selectedTasks.size === 0) return
    setBulkLoading(true)
    try {
      await fn()
      clearSelection()
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Bulk action failed')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkMoveToBoard = () => {
    if (!props.pullStageId) {
      alert('No board column is configured to pull work into. Add a workflow stage on the board first.')
      return
    }
    void runBulk(async () => {
      for (const id of selectedTasks) {
        await patchTask({ id, workflow_stage_id: props.pullStageId })
      }
      setTasks((prev) => prev.filter((t) => !selectedTasks.has(t.id)))
    })
  }

  const handleBulkSetPriority = () => {
    void runBulk(async () => {
      for (const id of selectedTasks) {
        await patchTask({ id, priority: bulkPriority })
      }
      setTasks((prev) =>
        prev.map((t) => (selectedTasks.has(t.id) ? { ...t, priority: bulkPriority } : t))
      )
    })
  }

  const handleBulkDelete = () => {
    if (!confirm(`Delete ${selectedTasks.size} task(s)? This cannot be undone.`)) return
    void runBulk(async () => {
      for (const id of selectedTasks) {
        await deleteTask(id)
      }
      setTasks((prev) => prev.filter((t) => !selectedTasks.has(t.id)))
    })
  }

  const canCreate = !!props.backlogStageId && !!props.processId

  const handleCreateTask = async () => {
    if (!canCreate) return
    const title = createTitle.trim()
    if (!title) return

    const storyPoints = Number(createStoryPoints)
    const safeStoryPoints = Number.isFinite(storyPoints) && storyPoints >= 0 ? Math.floor(storyPoints) : 0
    const desc = createDescription.trim()

    setCreateLoading(true)
    try {
      const payload: Record<string, unknown> = {
        project_id: props.projectId,
        process_id: props.processId,
        workflow_stage_id: props.backlogStageId,
        title,
        priority: createPriority,
        story_points: isKanban ? null : safeStoryPoints,
        description: desc.length > 0 ? desc : null,
        sprint_id: null,
      }
      if (createTeamId) payload.team_id = createTeamId
      if (isKanban) {
        payload.size_band = createSizeBand.trim() || null
        payload.service_class = createServiceClass || 'standard'
      }

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to create task')

      const created = json?.data as Partial<BacklogTask> | undefined
      if (created?.id) {
        setTasks((prev) => [
          {
            id: String(created.id),
            title: String(created.title ?? title),
            description: (created.description ?? null) as string | null,
            priority: (created.priority ?? createPriority) as BacklogTask['priority'],
            story_points: (created.story_points ?? (isKanban ? null : safeStoryPoints)) as number | null,
            assignee_id: (created.assignee_id ?? null) as string | null,
            position: (created.position ?? null) as number | null,
            team_id: (created.team_id ?? (createTeamId || null)) as string | null,
            workflow_stage_id: props.backlogStageId,
            size_band: (created.size_band ?? (createSizeBand || null)) as BacklogTask['size_band'],
            service_class: (created.service_class ?? createServiceClass) as BacklogTask['service_class'],
          },
          ...prev.filter((t) => t.id !== created.id),
        ])
      }

      setCreateTitle('')
      setCreateDescription('')
      setCreatePriority('medium')
      setCreateStoryPoints('0')
      setCreateTeamId('')
      setCreateSizeBand('')
      setCreateServiceClass('standard')
      setIsCreating(false)
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create task')
    } finally {
      setCreateLoading(false)
    }
  }

  const showKanbanSelection = isKanban && !!props.processId
  const showScrumSelection = !isKanban

  return (
    <div className="space-y-6">
      <KanbanTaskDetailModal
        taskId={detailTaskId}
        open={detailTaskId !== null}
        onOpenChange={(o) => {
          if (!o) setDetailTaskId(null)
        }}
        onTaskSaved={handleDetailSaved}
        flowAdvancedFields={isKanban}
      />

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <Link
          href={`/dashboard/projects/${props.projectId}/phases/${props.phaseId}`}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Phase Overview
        </Link>
        {boardHref ? (
          <Link
            href={boardHref}
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
            View board
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Backlog</h1>
          <p className="text-gray-600 mt-1 max-w-2xl">
            {isKanban
              ? `Options queue for “${props.phaseTitle}” — refine with clear titles and descriptions, then pull work onto the board when capacity allows.`
              : `Backlog items for “${props.phaseTitle}” (Scrum)`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {showScrumSelection && selectedTasks.size > 0 ? (
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAddToSprint}>
              <Plus className="h-4 w-4 mr-2" />
              Add {selectedTasks.size} tasks to Sprint
            </Button>
          ) : null}
          {showKanbanSelection && selectedTasks.size > 0 ? (
            <>
              <Button
                variant="default"
                className="bg-blue-600 hover:bg-blue-700 gap-1"
                disabled={bulkLoading || !props.pullStageId}
                title={
                  props.pullStageId
                    ? `Move to ${props.pullStageName ?? 'board'}`
                    : 'Configure a board column first'
                }
                onClick={handleBulkMoveToBoard}
              >
                <ArrowRightCircle className="h-4 w-4" />
                Pull to {props.pullStageName ?? 'board'} ({selectedTasks.size})
              </Button>
              <div className="flex items-center gap-1">
                <select
                  className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm"
                  value={bulkPriority}
                  onChange={(e) => setBulkPriority(e.target.value as typeof bulkPriority)}
                  disabled={bulkLoading}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <Button variant="outline" size="sm" disabled={bulkLoading} onClick={handleBulkSetPriority}>
                  Set priority
                </Button>
              </div>
              <Button variant="outline" size="sm" disabled={bulkLoading} onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </>
          ) : null}
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
            {isKanban ? (
              <div className="grid grid-cols-1 gap-4">
                <p className="text-sm text-gray-600">
                  Add a concise title and enough description that the next person can start without a handoff meeting.
                  Story points are not used in Kanban.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-8">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <Input
                      placeholder="Short, actionable summary of the work"
                      value={createTitle}
                      onChange={(e) => setCreateTitle(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 text-sm"
                      value={createPriority}
                      onChange={(e) => setCreatePriority(e.target.value as BacklogTask['priority'])}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="md:col-span-6">
                    <Label className="text-sm font-medium text-gray-700 mb-1 block">Size (optional)</Label>
                    <select
                      className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 text-sm"
                      value={createSizeBand}
                      onChange={(e) => setCreateSizeBand(e.target.value)}
                    >
                      <option value="">— None —</option>
                      <option value="xs">XS</option>
                      <option value="s">S</option>
                      <option value="m">M</option>
                      <option value="l">L</option>
                      <option value="xl">XL</option>
                    </select>
                  </div>
                  <div className="md:col-span-6">
                    <Label className="text-sm font-medium text-gray-700 mb-1 block">Class of service</Label>
                    <select
                      className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 text-sm"
                      value={createServiceClass}
                      onChange={(e) => setCreateServiceClass(e.target.value)}
                    >
                      <option value="standard">Standard</option>
                      <option value="fixed_date">Fixed date</option>
                      <option value="expedite">Expedite</option>
                    </select>
                  </div>
                  {teamsList.length > 0 ? (
                    <div className="md:col-span-12 md:max-w-md">
                      <Label className="text-sm font-medium text-gray-700 mb-1 block">Team (optional)</Label>
                      <Select
                        value={createTeamId || '__none__'}
                        onValueChange={(v) => setCreateTeamId(v === '__none__' ? '' : v)}
                      >
                        <SelectTrigger className="h-10 bg-white">
                          <SelectValue placeholder="No team" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No team</SelectItem>
                          {teamsList.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                  <div className="md:col-span-12">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <Textarea
                      placeholder="Context, acceptance criteria, links, dependencies — whatever helps when this is pulled into a column."
                      value={createDescription}
                      onChange={(e) => setCreateDescription(e.target.value)}
                      className="min-h-[120px] resize-y"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreating(false)
                      setCreateTeamId('')
                    }}
                    disabled={createLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => void handleCreateTask()}
                    disabled={createLoading || !createTitle.trim()}
                  >
                    {createLoading ? 'Creating…' : 'Add to backlog'}
                  </Button>
                </div>
              </div>
            ) : (
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
                    onChange={(e) => setCreatePriority(e.target.value as BacklogTask['priority'])}
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
                {teamsList.length > 0 ? (
                  <div className="md:col-span-12 md:max-w-md">
                    <Label className="text-sm font-medium text-gray-700 mb-1 block">Team (optional)</Label>
                    <Select
                      value={createTeamId || '__none__'}
                      onValueChange={(v) => setCreateTeamId(v === '__none__' ? '' : v)}
                    >
                      <SelectTrigger className="h-10 bg-white">
                        <SelectValue placeholder="No team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No team</SelectItem>
                        {teamsList.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <div className="md:col-span-12 flex gap-2 justify-end pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreating(false)
                      setCreateTeamId('')
                    }}
                    disabled={createLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => void handleCreateTask()}
                    disabled={createLoading || !createTitle.trim()}
                  >
                    {createLoading ? 'Creating…' : 'Create'}
                  </Button>
                </div>
              </div>
            )}
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
            <CardTitle className="text-sm font-medium text-gray-600">
              {isKanban ? 'Refined' : 'Story Points'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {isKanban ? kanbanDetailedCount : totalStoryPoints}
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {isKanban
                ? selectedTasks.size > 0
                  ? 'Selected'
                  : 'Needs refinement'
                : 'Selected'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-2xl font-bold',
                selectedTasks.size > 0 ? 'text-blue-600' : isKanban ? 'text-amber-600' : 'text-blue-600'
              )}
            >
              {isKanban && selectedTasks.size === 0 ? kanbanUnrefinedCount : selectedTasks.size}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="flex-1 relative min-w-[200px]">
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
            {teamsList.length > 0 ? (
              <div className="grid gap-1.5">
                <Label className="text-xs text-gray-600">Team</Label>
                <Select
                  value={teamFilterId || '__all__'}
                  onValueChange={(v) => setTeamFilter(v === '__all__' ? '' : v)}
                >
                  <SelectTrigger className="h-10 w-[200px] bg-white">
                    <SelectValue placeholder="All teams" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All teams</SelectItem>
                    {teamsList.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div>
              <CardTitle className="text-lg">{isKanban ? 'Backlog queue' : 'Backlog Items'}</CardTitle>
              {isKanban && canReorder ? (
                <p className="text-xs text-gray-500 mt-1">Drag the handle to set pull order. Click a row for full details.</p>
              ) : isKanban && filtersActive ? (
                <p className="text-xs text-amber-600 mt-1">Clear filters to reorder the queue.</p>
              ) : null}
            </div>
            {(showKanbanSelection || showScrumSelection) && filteredTasks.length > 0 ? (
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                  onChange={handleSelectAll}
                  className="rounded"
                />
                Select all
              </label>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No tasks found in backlog</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void handleDragEnd(e)}>
              <SortableContext items={sortedTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {sortedTasks.map((task) => (
                    <SortableBacklogRow
                      key={task.id}
                      task={task}
                      queueIndex={queueIndexByTaskId[task.id] ?? 0}
                      isKanban={isKanban}
                      teamsList={teamsList}
                      assigneeNames={assigneeNames}
                      selected={selectedTasks.has(task.id)}
                      canReorder={canReorder}
                      onToggleSelect={toggleTaskSelection}
                      onOpen={openTaskDetail}
                      showSelection={showKanbanSelection || showScrumSelection}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

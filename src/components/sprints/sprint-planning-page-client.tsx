'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, ArrowLeft, Save, Play, Target, Minus, Plus, Loader2, Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BacklogTaskCard } from '@/components/project/backlog-task-card'
import { KanbanTaskDetailModal, type TaskRowLite } from '@/components/project/KanbanTaskDetailModal'
import { TaskMessageDialog, taskErrorDialogFromUnknown } from '@/components/tasks/task-message-dialog'
import { activateSprintWithScheduledDates } from '@/lib/sprints/activate-sprint'
import {
  getLocalDateString,
  isSprintStartDateInPast,
} from '@/lib/sprints/sprint-date-validation'

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

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return ''
  const s = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
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
  /** `sdlc.sprints.create` — save sprint proposals as drafts (no dates). */
  canCreateSprintDraft?: boolean
  /** `pm.sprints.manage` — set dates, start sprints, approve drafts. */
  canManageSprints?: boolean
  draftSprint?: { id: string; name: string; start_date?: string | null; end_date?: string | null } | null
  draftTasks?: Task[]
}) {
  const canCreateSprintDraft = props.canCreateSprintDraft === true
  const canManageSprints = props.canManageSprints === true
  const isEditingDraft = Boolean(props.draftSprint?.id)
  const canSaveDraft = canCreateSprintDraft
  const canStartSprint = canManageSprints
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

  const [sprintName, setSprintName] = useState(props.draftSprint?.name || 'Sprint 1')
  const [startDate, setStartDate] = useState(() => toDateInputValue(props.draftSprint?.start_date))
  const [endDate, setEndDate] = useState(() => toDateInputValue(props.draftSprint?.end_date))
  const [formError, setFormError] = useState<string | null>(null)

  // Combine backlogTasks and draftTasks if draftTasks exist, but only initialize selectedTasks with draftTasks ids.
  const allInitialTasks = useMemo(() => {
    const combined = [...props.backlogTasks, ...(props.draftTasks || [])]
    return uniqueById(combined)
  }, [props.backlogTasks, props.draftTasks])

  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(() => {
    if (props.draftTasks && props.draftTasks.length > 0) {
      return new Set(props.draftTasks.map(t => t.id))
    }
    return new Set()
  })

  // The UI displays all tasks in backlogTasks except those in sprintTasks
  const [backlogTasks, setBacklogTasks] = useState<Task[]>(allInitialTasks)
  const [sprintTasks, setSprintTasks] = useState<Task[]>(props.draftTasks || [])
  const [loading, setLoading] = useState(false)
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<{ id: string; title: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [createErrorDialog, setCreateErrorDialog] = useState<{ title: string; message: string } | null>(null)

  useEffect(() => {
    const tasksParam = searchParams.get('tasks')
    if (tasksParam) setSelectedTasks(new Set(tasksParam.split(',')))
  }, [searchParams])

  useEffect(() => {
    if (!props.draftSprint) return
    setSprintName(props.draftSprint.name || 'Sprint 1')
    setStartDate(toDateInputValue(props.draftSprint.start_date))
    setEndDate(toDateInputValue(props.draftSprint.end_date))
  }, [
    props.draftSprint?.id,
    props.draftSprint?.name,
    props.draftSprint?.start_date,
    props.draftSprint?.end_date,
  ])

  const selectedTaskObjects = useMemo(
    () => backlogTasks.filter((t) => selectedTasks.has(t.id)),
    [backlogTasks, selectedTasks]
  )
  const selectedStoryPoints = selectedTaskObjects.reduce((sum, t) => sum + (t.story_points || 0), 0)
  const remainingBacklog = backlogTasks.filter((t) => !sprintTasks.find(st => st.id === t.id))
  const capacity = Math.max(1, capacityPoints || defaultCapacity)
  const sprintBacklogStoryPoints = sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0)
  const todayDateStr = useMemo(() => getLocalDateString(), [])
  const startDateInPast = Boolean(startDate) && isSprintStartDateInPast(startDate)
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
          phase_id: props.phaseId,
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
      setCreateErrorDialog(taskErrorDialogFromUnknown(e, 'Failed to create task'))
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
    setSelectedTasks(new Set())
  }

  const openTaskEdit = (taskId: string) => {
    setDetailTaskId(taskId)
    setDetailOpen(true)
  }

  const mapSavedTaskToLocal = (row: TaskRowLite): Task => ({
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    priority: row.priority,
    story_points: row.story_points,
    assignee_id: row.assignee_id ?? null,
    position: row.position,
  })

  const handleTaskSaved = (row: TaskRowLite) => {
    const updated = mapSavedTaskToLocal(row)
    setBacklogTasks((prev) => prev.map((t) => (t.id === row.id ? updated : t)))
    setSprintTasks((prev) => prev.map((t) => (t.id === row.id ? updated : t)))
    router.refresh()
  }

  const findTaskTitle = (taskId: string) => {
    const task = backlogTasks.find((t) => t.id === taskId) ?? sprintTasks.find((t) => t.id === taskId)
    return task?.title ?? 'this task'
  }

  const requestDeleteTask = (taskId: string) => {
    setDeleteError(null)
    setDeleteConfirmTask({ id: taskId, title: findTaskTitle(taskId) })
  }

  const closeDeleteDialog = () => {
    if (deleteLoading) return
    setDeleteConfirmTask(null)
    setDeleteError(null)
  }

  const confirmDeleteTask = async () => {
    if (!deleteConfirmTask) return
    const taskId = deleteConfirmTask.id
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/tasks?id=${encodeURIComponent(taskId)}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((json?.error as string) || 'Failed to delete task')

      setBacklogTasks((prev) => prev.filter((t) => t.id !== taskId))
      setSprintTasks((prev) => prev.filter((t) => t.id !== taskId))
      setSelectedTasks((prev) => {
        if (!prev.has(taskId)) return prev
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
      setDeleteConfirmTask(null)
      router.refresh()
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Failed to delete task')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleRemoveFromSprint = (taskId: string) => {
    setSprintTasks((prevSprint) => prevSprint.filter((t) => t.id !== taskId))
    setSelectedTasks((prevSelected) => {
      if (!prevSelected.has(taskId)) return prevSelected
      const next = new Set(prevSelected)
      next.delete(taskId)
      return next
    })
  }

  const assignTasksToSprint = async (sprintId: string, moveToBoard: boolean) => {
    const taskResults = await Promise.all(
      sprintTasks.map(async (t) => {
        const res = await fetch('/api/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: t.id,
            sprint_id: sprintId,
            ...(props.processId ? { process_id: props.processId } : {}),
            ...(moveToBoard && props.sprintStartStageId ? { workflow_stage_id: props.sprintStartStageId } : {}),
          }),
        })
        const json = await res.json().catch(() => ({}))
        return { ok: res.ok, status: res.status, error: json?.error as string | undefined, taskId: t.id }
      }),
    )

    const failed = taskResults.filter((r) => !r.ok)
    if (failed.length > 0) {
      const first = failed[0]
      throw new Error(first.error || `Failed to assign ${failed.length} task(s) into the sprint (status ${first.status})`)
    }
  }

  const handleSaveDraft = async () => {
    setFormError(null)
    if (!canSaveDraft) {
      setFormError('You do not have permission to save sprint drafts')
      return
    }

    if (!sprintName.trim()) {
      setFormError('Please enter a sprint name')
      return
    }

    if (sprintTasks.length === 0) {
      setFormError('Please add at least one task to the sprint')
      return
    }

    if (sprintBacklogStoryPoints > capacity) {
      setFormError(`Sprint exceeds capacity (${sprintBacklogStoryPoints}/${capacity} points)`)
      return
    }

    setLoading(true)
    try {
      let sprintId = props.draftSprint?.id

      if (sprintId) {
        const updateRes = await fetch('/api/sprints', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: sprintId,
            name: sprintName.trim(),
            start_date: startDate || undefined,
            end_date: endDate || undefined,
            story_points_total: sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0),
          }),
        })
        const updated = await updateRes.json()
        if (!updateRes.ok) throw new Error(updated?.error || 'Failed to update sprint draft')
      } else {
        const createRes = await fetch('/api/sprints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: props.projectId,
            phase_id: props.phaseId,
            process_id: props.processId,
            name: sprintName.trim(),
            start_date: startDate || undefined,
            end_date: endDate || undefined,
            story_points_total: sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0),
            status: 'draft',
          }),
        })

        const created = await createRes.json()
        if (!createRes.ok) throw new Error(created?.error || 'Failed to save sprint draft')
        sprintId = created?.data?.id
      }

      if (!sprintId) throw new Error('Failed to save sprint draft (missing id)')

      // Also unassign tasks that were removed from the draft
      if (props.draftTasks) {
        const removedTasks = props.draftTasks.filter(dt => !sprintTasks.find(st => st.id === dt.id))
        if (removedTasks.length > 0) {
          await Promise.all(
            removedTasks.map((t) =>
              fetch('/api/tasks', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: t.id,
                  sprint_id: null,
                  ...(props.backlogStageId ? { workflow_stage_id: props.backlogStageId } : {}),
                }),
              }),
            )
          )
        }
      }

      await assignTasksToSprint(sprintId, false)

      if (props.processId) {
        router.push(
          `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/processes/${props.processId}/sprints`,
        )
      } else {
        router.push(`/dashboard/projects/${props.projectId}/phases/${props.phaseId}/sprints`)
      }
      router.refresh()
    } catch (e) {
      console.error(e)
      setFormError(e instanceof Error ? e.message : 'Failed to save sprint draft')
    } finally {
      setLoading(false)
    }
  }

  const validateSprintFormForStartOrActivate = (): string | null => {
    if (!sprintName.trim() || !startDate || !endDate) {
      return 'Please fill in all sprint details'
    }
    if (sprintTasks.length === 0) {
      return 'Please add at least one task to the sprint'
    }
    if (new Date(endDate) < new Date(startDate)) {
      return 'End date cannot be before start date'
    }
    if (isSprintStartDateInPast(startDate)) {
      return 'Sprint start date cannot be in the past'
    }
    if (sprintBacklogStoryPoints > capacity) {
      return `Sprint exceeds capacity (${sprintBacklogStoryPoints}/${capacity} points)`
    }
    return null
  }

  const persistDraftBeforeActivate = async (sprintId: string) => {
    const updateRes = await fetch('/api/sprints', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: sprintId,
        name: sprintName.trim(),
        start_date: startDate,
        end_date: endDate,
        story_points_total: sprintTasks.reduce((sum, t) => sum + (t.story_points || 0), 0),
      }),
    })
    const updated = await updateRes.json()
    if (!updateRes.ok) throw new Error(updated?.error || 'Failed to update sprint proposal')

    if (props.draftTasks) {
      const removedTasks = props.draftTasks.filter((dt) => !sprintTasks.find((st) => st.id === dt.id))
      if (removedTasks.length > 0) {
        await Promise.all(
          removedTasks.map((t) =>
            fetch('/api/tasks', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: t.id,
                sprint_id: null,
                ...(props.backlogStageId ? { workflow_stage_id: props.backlogStageId } : {}),
              }),
            }),
          ),
        )
      }
    }

    await assignTasksToSprint(sprintId, false)
  }

  const handleActivateDraft = async () => {
    setFormError(null)
    if (!canStartSprint) {
      setFormError('You do not have permission to activate sprints')
      return
    }

    const sprintId = props.draftSprint?.id
    if (!sprintId) {
      setFormError('No archived proposal to activate')
      return
    }

    const validationError = validateSprintFormForStartOrActivate()
    if (validationError) {
      setFormError(validationError)
      return
    }

    setLoading(true)
    try {
      await persistDraftBeforeActivate(sprintId)

      const result = await activateSprintWithScheduledDates(
        { id: sprintId, start_date: startDate, end_date: endDate },
        { fromDraft: true, sprintStartStageId: props.sprintStartStageId },
      )
      if (!result.ok) throw new Error(result.error)

      if (props.processId) {
        router.push(
          `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/processes/${props.processId}/board?sprintId=${encodeURIComponent(
            sprintId,
          )}`,
        )
      } else {
        router.push(`/dashboard/projects/${props.projectId}/phases/${props.phaseId}/sprints`)
      }
      router.refresh()
    } catch (e) {
      console.error(e)
      setFormError(e instanceof Error ? e.message : 'Failed to activate sprint')
    } finally {
      setLoading(false)
    }
  }

  const handleStartSprint = async () => {
    setFormError(null)
    if (!canStartSprint) {
      setFormError('You do not have permission to start sprints')
      return
    }

    if (isEditingDraft) {
      await handleActivateDraft()
      return
    }

    const validationError = validateSprintFormForStartOrActivate()
    if (validationError) {
      setFormError(validationError)
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
          name: sprintName.trim(),
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

      await assignTasksToSprint(sprintId, true)

      if (props.processId) {
        router.push(
          `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/processes/${props.processId}/board?sprintId=${encodeURIComponent(
            sprintId,
          )}`,
        )
      } else {
        router.push(`/dashboard/projects/${props.projectId}/phases/${props.phaseId}/sprints`)
      }
      router.refresh()
    } catch (e) {
      console.error(e)
      setFormError(e instanceof Error ? e.message : 'Failed to start sprint')
    } finally {
      setLoading(false)
    }
  }



  if (loading) {
    return <div className="flex justify-center py-12">Loading...</div>
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

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditingDraft ? 'Archived sprint proposal' : 'Sprint Planning'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditingDraft
              ? canStartSprint
                ? 'Update tasks and dates, then activate when ready'
                : 'Update tasks and save the proposal for sprint manager approval'
              : canSaveDraft && !canStartSprint
                ? 'Select backlog tasks and save a draft for sprint manager approval'
                : 'Select tasks from backlog and plan your sprint'}
          </p>
        </div>
        <div className="flex gap-2">
          {canSaveDraft && !isEditingDraft ? (
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={!sprintName.trim() || sprintTasks.length === 0 || sprintBacklogStoryPoints > capacity}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive Sprint
            </Button>
          ) : null}
          {canSaveDraft && isEditingDraft ? (
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={!sprintName.trim() || sprintTasks.length === 0 || sprintBacklogStoryPoints > capacity}
            >
              <Save className="h-4 w-4 mr-2" />
              Save proposal
            </Button>
          ) : null}
          {canStartSprint && isEditingDraft ? (
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => void handleActivateDraft()}
              disabled={
                !sprintName ||
                !startDate ||
                !endDate ||
                startDateInPast ||
                sprintTasks.length === 0 ||
                sprintBacklogStoryPoints > capacity
              }
            >
              <Play className="h-4 w-4 mr-2" />
              Activate sprint
            </Button>
          ) : null}
          {canStartSprint && !isEditingDraft ? (
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleStartSprint}
              disabled={
                !sprintName ||
                !startDate ||
                !endDate ||
                startDateInPast ||
                sprintTasks.length === 0 ||
                sprintBacklogStoryPoints > capacity
              }
            >
              <Play className="h-4 w-4 mr-2" />
              Start Sprint
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Sprint Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid grid-cols-1 gap-4 ${canManageSprints ? 'md:grid-cols-3' : ''}`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sprint Name</label>
              <Input value={sprintName} onChange={(e) => setSprintName(e.target.value)} placeholder="Sprint 1" />
            </div>
            {canManageSprints ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <Input
                    type="date"
                    min={todayDateStr}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  {startDateInPast ? (
                    <p className="mt-1 text-xs text-red-600">Start date cannot be in the past.</p>
                  ) : null}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <Input
                    type="date"
                    min={startDate && !startDateInPast ? startDate : todayDateStr}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500 md:col-span-2">
                Start and end dates are set when a sprint manager approves your draft.
              </p>
            )}
          </div>
          {formError ? <p className="mt-3 text-sm text-red-600">{formError}</p> : null}
        </CardContent>
      </Card>

      <Card
        className={`border-2 shadow-sm ${capacityStatus === 'over'
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
                className={`p-3 rounded-lg ${capacityStatus === 'over'
                  ? 'bg-red-100'
                  : capacityStatus === 'under'
                    ? 'bg-yellow-100'
                    : 'bg-green-100'
                  }`}
              >
                <Target
                  className={`h-6 w-6 ${capacityStatus === 'over'
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
                      priority: task.priority,
                      storyPoints: task.story_points || 0,
                      assignee: null,
                      position: task.position || 0,
                    }}
                    isSelected={selectedTasks.has(task.id)}
                    onSelect={() => toggleTaskSelection(task.id)}
                    onEdit={() => openTaskEdit(task.id)}
                    onDelete={() => requestDeleteTask(task.id)}
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
                      priority: task.priority,
                      storyPoints: task.story_points || 0,
                      assignee: null,
                      position: task.position || 0,
                    }}
                    isSelected={false}
                    onSelect={() => { }}
                    showCheckbox={false}
                    onEdit={() => openTaskEdit(task.id)}
                    onDelete={() => handleRemoveFromSprint(task.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <KanbanTaskDetailModal
        taskId={detailTaskId}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) setDetailTaskId(null)
        }}
        onTaskSaved={handleTaskSaved}
      />

      <TaskMessageDialog
        open={!!createErrorDialog}
        onOpenChange={(open) => !open && setCreateErrorDialog(null)}
        title={createErrorDialog?.title ?? ''}
        message={createErrorDialog?.message ?? ''}
        variant="error"
      />

      <Dialog open={!!deleteConfirmTask} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete task</DialogTitle>
            <DialogDescription>
              {deleteConfirmTask ? (
                <>
                  Permanently delete{' '}
                  <span className="font-medium text-gray-900">&ldquo;{deleteConfirmTask.title}&rdquo;</span>? This
                  removes the task from the backlog and cannot be undone.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {deleteError ? <p className="text-sm text-red-600">{deleteError}</p> : null}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={closeDeleteDialog} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDeleteTask()}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete task'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


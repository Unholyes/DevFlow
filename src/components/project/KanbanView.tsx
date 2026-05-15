'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
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
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { TaskTypeIcon } from '@/components/tasks/task-type-icon'
import { BlockedTaskChip } from '@/components/tasks/blocked-task-chip'
import { TASK_TYPE_META, TASK_TYPES } from '@/lib/tasks/task-type'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GripVertical, HelpCircle, LayoutList, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { KanbanTaskDetailModal, type TaskRowLite } from '@/components/project/KanbanTaskDetailModal'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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
  description?: string | null
  priority: 'low' | 'medium' | 'high' | 'critical'
  story_points: number | null
  workflow_stage_id: string
  completed_at: string | null
  position: number | null
  current_stage_entered_at?: string | null
  size_band?: 'xs' | 's' | 'm' | 'l' | 'xl' | null
  service_class?: 'standard' | 'fixed_date' | 'expedite' | null
  team_id?: string | null
  assignee_id?: string | null
  blocked?: boolean
  blocked_reason?: string | null
  task_type?: string | null
}

export type KanbanFlowMetrics = {
  throughput7d: number
  avgLeadTimeDays30d: number | null
}

const KANBAN_FLOW_ADVANCED_STORAGE_KEY = 'devflow:kanban-flow-advanced-fields'

function HelpTip({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex shrink-0 rounded-full p-0.5 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
            className
          )}
          aria-label={label}
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
        {children}
      </TooltipContent>
    </Tooltip>
  )
}

function formatAgeInStage(iso: string | null | undefined): string | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return null
  const hours = Math.floor(ms / 3600000)
  const days = Math.floor(ms / 86400000)
  if (days >= 1) return `${days}d`
  if (hours >= 1) return `${hours}h`
  return '<1h'
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

function stageTaskIds(tasks: TaskRow[], stageId: string) {
  return tasks
    .filter((t) => t.workflow_stage_id === stageId)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((t) => t.id)
}

const BOARD_COL_PREFIX = 'board-col-'

function boardColSortableId(stageId: string) {
  return `${BOARD_COL_PREFIX}${stageId}`
}

function parseBoardColSortableId(id: string): string | null {
  return id.startsWith(BOARD_COL_PREFIX) ? id.slice(BOARD_COL_PREFIX.length) : null
}

function findContainer(id: UniqueIdentifier, columns: Record<string, string[]>) {
  const sid = String(id)
  if (sid in columns) return sid
  for (const key of Object.keys(columns)) {
    if (columns[key].includes(sid)) return key
  }
  return undefined
}

/** Matches `enforce_kanban_wip_limit`: incomplete tasks = `completed_at IS NULL`. */
function countOpenWipTasksInStage(tasks: TaskRow[], stageId: string, excludeTaskId?: string): number {
  return tasks.filter(
    (t) =>
      t.workflow_stage_id === stageId &&
      t.completed_at == null &&
      (excludeTaskId == null || t.id !== excludeTaskId)
  ).length
}

function isMoveBlockedByWip(
  tasks: TaskRow[],
  targetStageId: string,
  movingTaskId: string,
  stageById: Record<string, Stage>
): boolean {
  const stage = stageById[targetStageId]
  if (stage == null || stage.wip_limit == null) return false
  const occupying = countOpenWipTasksInStage(tasks, targetStageId, movingTaskId)
  return occupying >= stage.wip_limit
}

function parseKanbanWipErrorMessage(
  message: string,
  stageById: Record<string, Stage>,
  tasks: TaskRow[]
): { stageName: string; limit: number; openCount: number } | null {
  if (!message.includes('WIP limit exceeded')) return null
  const limMatch = message.match(/limit=(\d+)\)/)
  const sidMatch = message.match(/stage_id=([^,)]+)/)
  const limit = limMatch ? Number(limMatch[1]) : 0
  const sid = sidMatch?.[1]?.trim() ?? ''
  const stageName = sid && stageById[sid] ? stageById[sid].name : 'That column'
  const openCount = sid ? countOpenWipTasksInStage(tasks, sid) : 0
  return { stageName, limit, openCount }
}

function applyColumnOrders(
  tasks: TaskRow[],
  columnIds: Record<string, string[]>,
  stageById: Record<string, Stage>
): TaskRow[] {
  const byId = Object.fromEntries(tasks.map((t) => [t.id, { ...t }])) as Record<string, TaskRow>
  for (const stageId of Object.keys(columnIds)) {
    const stage = stageById[stageId]
    if (!stage) continue
    const ids = columnIds[stageId] ?? []
    ids.forEach((id, index) => {
      const t = byId[id]
      if (!t) return
      const prevStage = t.workflow_stage_id
      t.workflow_stage_id = stageId
      t.position = index
      if (prevStage !== stageId) {
        t.current_stage_entered_at = new Date().toISOString()
      }
      t.completed_at = stage.is_done ? (t.completed_at ?? new Date().toISOString()) : null
    })
  }
  return tasks.map((t) => byId[t.id] ?? t)
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

/** Movement past this (px) between pointer down and click → treat as drag, do not open details. */
const CARD_CLICK_MAX_MOVE_PX = 12

function SortableCard({
  task,
  stage,
  disabled,
  onOpen,
  teamsList,
  showFlowAdvanced,
}: {
  task: TaskRow
  stage: Stage
  disabled: boolean
  onOpen: (task: TaskRow) => void
  teamsList: { id: string; name: string }[]
  showFlowAdvanced: boolean
}) {
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  }

  const ageLabel = !stage.is_done ? formatAgeInStage(task.current_stage_entered_at) : null
  const svc = task.service_class ?? 'standard'
  const teamName = task.team_id ? teamsList.find((x) => x.id === task.team_id)?.name : null
  const showSvcChrome = showFlowAdvanced && (svc === 'expedite' || svc === 'fixed_date')

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onPointerDown={(e) => {
        pointerStartRef.current = { x: e.clientX, y: e.clientY }
        listeners?.onPointerDown?.(e)
      }}
      onClick={(e) => {
        if (disabled) return
        const start = pointerStartRef.current
        pointerStartRef.current = null
        if (start) {
          const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y)
          if (moved > CARD_CLICK_MAX_MOVE_PX) return
        }
        onOpen(task)
      }}
      onKeyDown={(e: KeyboardEvent) => {
        listeners?.onKeyDown?.(e)
        if (e.defaultPrevented) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (!disabled) onOpen(task)
        }
      }}
      className={cn(
        'bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all touch-none select-none p-3 text-left outline-none cursor-grab active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1',
        disabled && 'cursor-not-allowed opacity-60',
        showFlowAdvanced && svc === 'expedite' && 'border-l-[3px] border-l-red-500',
        showFlowAdvanced && svc === 'fixed_date' && 'border-l-[3px] border-l-amber-400',
        task.blocked && 'border-red-200 ring-1 ring-red-100'
      )}
    >
      <div className="flex justify-between items-start gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <TaskTypeIcon type={task.task_type} size="sm" />
          {task.blocked ? <BlockedTaskChip compact reason={task.blocked_reason} /> : null}
        </div>
        <Badge
          variant="outline"
          title={`Priority: ${task.priority === 'critical' ? 'high' : task.priority}`}
          className={`text-[10px] font-bold shrink-0 ${priorityStyle(task.priority)}`}
        >
          Priority · {task.priority === 'critical' ? 'high' : task.priority}
        </Badge>
      </div>
      <h4 className="text-sm font-bold text-gray-800 mb-2 leading-snug">{task.title}</h4>
      {task.blocked && task.blocked_reason?.trim() ? (
        <BlockedTaskChip reason={task.blocked_reason} className="mb-2" />
      ) : null}
      {teamName ? (
        <p className="text-[10px] font-medium text-blue-700 mb-1 truncate" title={teamName}>
          {teamName}
        </p>
      ) : null}
      <div className="pt-3 border-t border-gray-50 space-y-2 min-h-[2rem]">
        {task.description?.trim() ? (
          <p className="text-[10px] text-gray-500 line-clamp-2">{task.description}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-400">
          {ageLabel ? (
            <span title="Time in current column" className="text-gray-500">
              {ageLabel} in column
            </span>
          ) : null}
          {task.size_band && showFlowAdvanced ? (
            <Badge variant="outline" className="text-[9px] px-1 py-0 font-semibold uppercase tracking-wide">
              {task.size_band}
            </Badge>
          ) : null}
          {showSvcChrome ? (
            svc === 'expedite' ? (
              <span className="font-semibold text-red-600">Expedite</span>
            ) : (
              <span className="font-medium text-amber-700">Fixed date</span>
            )
          ) : null}
        </div>
      </div>
    </div>
  )
}

function KanbanColumn({
  stage,
  tasksInColumn,
  stageById,
  disabled,
  onRequestDelete,
  onEditWip,
  onOpenTask,
  teamsList,
  showFlowAdvanced,
  columnDragHandleProps,
}: {
  stage: Stage
  tasksInColumn: TaskRow[]
  stageById: Record<string, Stage>
  disabled: boolean
  onRequestDelete?: () => void
  onEditWip?: () => void
  onOpenTask: (task: TaskRow) => void
  teamsList: { id: string; name: string }[]
  showFlowAdvanced: boolean
  /** When set, shows a Jira-style column drag handle (listeners should stay on this control only). */
  columnDragHandleProps?: HTMLAttributes<HTMLButtonElement>
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const ids = tasksInColumn.map((t) => t.id)

  return (
    <div className="min-w-[320px] flex flex-col gap-4">
      <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center gap-2">
        <div className="min-w-0 flex-1 flex items-center gap-1.5">
          {columnDragHandleProps ? (
            <button
              type="button"
              title="Drag to reorder column"
              disabled={disabled}
              className={cn(
                'shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 touch-none select-none',
                'cursor-grab active:cursor-grabbing disabled:opacity-40 disabled:cursor-not-allowed'
              )}
              {...columnDragHandleProps}
            >
              <GripVertical className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
          <span className="font-bold text-gray-800 text-sm">{stage.name}</span>
          <span className="ml-2 text-xs text-gray-400 font-medium">{tasksInColumn.length} tasks</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {stage.wip_limit != null ? (
            <span className="text-[10px] font-bold bg-green-50 text-green-600 px-2 py-0.5 rounded border border-green-100 uppercase">
              WIP:{' '}
              {
                tasksInColumn.filter((t) => {
                  const st = stageById[t.workflow_stage_id]
                  return st && !st.is_done && !t.completed_at
                }).length
              }
              /{stage.wip_limit}
            </span>
          ) : (
            <span className="text-[10px] font-bold bg-gray-50 text-gray-500 px-2 py-0.5 rounded border border-gray-100 uppercase">
              No WIP cap
            </span>
          )}
          {onEditWip ? (
            <button
              type="button"
              title="Edit WIP limit"
              disabled={disabled}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onEditWip()
              }}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {onRequestDelete ? (
            <button
              type="button"
              title="Remove column"
              disabled={disabled}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onRequestDelete()
              }}
              className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 space-y-4 overflow-y-auto pr-2 min-h-[120px] rounded-lg transition-colors ${
          isOver ? 'bg-blue-50/80 ring-2 ring-blue-100' : ''
        }`}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {tasksInColumn.map((task) => (
            <SortableCard
              key={task.id}
              task={task}
              stage={stage}
              disabled={disabled}
              onOpen={onOpenTask}
              teamsList={teamsList}
              showFlowAdvanced={showFlowAdvanced}
            />
          ))}
        </SortableContext>
        {tasksInColumn.length === 0 ? (
          <div className="text-xs text-gray-400 px-2 py-8 text-center border border-dashed border-gray-200 rounded-lg">
            Drop work items here
          </div>
        ) : null}
      </div>
    </div>
  )
}

function SortableKanbanColumn({
  stage,
  tasksInColumn,
  stageById,
  disabled,
  onRequestDelete,
  onEditWip,
  onOpenTask,
  teamsList,
  showFlowAdvanced,
}: {
  stage: Stage
  tasksInColumn: TaskRow[]
  stageById: Record<string, Stage>
  disabled: boolean
  onRequestDelete?: () => void
  onEditWip?: () => void
  onOpenTask: (task: TaskRow) => void
  teamsList: { id: string; name: string }[]
  showFlowAdvanced: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: boardColSortableId(stage.id),
    data: { type: 'column' as const },
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('shrink-0', isDragging && 'z-20 opacity-90')}
    >
      <KanbanColumn
        stage={stage}
        tasksInColumn={tasksInColumn}
        stageById={stageById}
        disabled={disabled}
        onRequestDelete={onRequestDelete}
        onEditWip={onEditWip}
        onOpenTask={onOpenTask}
        teamsList={teamsList}
        showFlowAdvanced={showFlowAdvanced}
        columnDragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

function AddColumnTrigger({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <div className="flex w-11 shrink-0 flex-col items-center self-stretch justify-start pt-3">
      <button
        type="button"
        title="Add column"
        disabled={disabled}
        onClick={onClick}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-gray-500 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}

function BacklogDropZone({ stageId, children }: { stageId: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stageId })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[120px] rounded-lg border border-dashed border-gray-200 bg-slate-50/80 p-3 transition-colors',
        isOver && 'border-blue-300 bg-blue-50/60'
      )}
    >
      {children}
    </div>
  )
}

export default function KanbanView(props: {
  projectId: string
  phaseId: string
  processId: string
  stages: Stage[]
  tasks: TaskRow[]
  flowMetrics?: KanbanFlowMetrics
  /** Workspace teams for labels + filter (optional). */
  teams?: { id: string; name: string }[]
}) {
  const flowMetrics = props.flowMetrics ?? { throughput7d: 0, avgLeadTimeDays30d: null as number | null }
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const teamsList = props.teams ?? []
  const [tasks, setTasks] = useState<TaskRow[]>(props.tasks)
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [persisting, setPersisting] = useState(false)
  const tasksRef = useRef<TaskRow[]>(props.tasks)
  const lastPersistedRef = useRef<TaskRow[]>(props.tasks)
  const persistTimerRef = useRef<number | null>(null)
  const persistInFlightRef = useRef(false)
  const persistQueuedRef = useRef(false)

  const [addOpen, setAddOpen] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [newColumnWip, setNewColumnWip] = useState('')
  const [columnMutation, setColumnMutation] = useState(false)
  const [reorderingColumns, setReorderingColumns] = useState(false)
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null)
  const [draggingColumn, setDraggingColumn] = useState<Stage | null>(null)

  const [deleteStage, setDeleteStage] = useState<Stage | null>(null)
  const [deleteMoveTargetId, setDeleteMoveTargetId] = useState<string>('')

  const [wipEditStage, setWipEditStage] = useState<Stage | null>(null)
  const [wipEditValue, setWipEditValue] = useState('')
  const [wipSaving, setWipSaving] = useState(false)

  const [backlogCreateOpen, setBacklogCreateOpen] = useState(false)
  const [backlogCreateTitle, setBacklogCreateTitle] = useState('')
  const [backlogCreateDescription, setBacklogCreateDescription] = useState('')
  const [backlogCreatePriority, setBacklogCreatePriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
  const [backlogCreateLoading, setBacklogCreateLoading] = useState(false)
  const [backlogCreateSize, setBacklogCreateSize] = useState<string>('')
  const [backlogCreateService, setBacklogCreateService] = useState<string>('standard')
  const [backlogCreateTaskType, setBacklogCreateTaskType] = useState<string>('task')
  const [showAdvancedFlowFields, setShowAdvancedFlowFields] = useState(false)

  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)
  const [wipBlockedInfo, setWipBlockedInfo] = useState<{
    stageName: string
    limit: number
    openCount: number
  } | null>(null)

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

  useEffect(() => {
    try {
      if (localStorage.getItem(KANBAN_FLOW_ADVANCED_STORAGE_KEY) === '1') {
        setShowAdvancedFlowFields(true)
      }
    } catch {
      /* ignore */
    }
  }, [])

  const persistAdvancedFlowFields = useCallback((on: boolean) => {
    setShowAdvancedFlowFields(on)
    try {
      localStorage.setItem(KANBAN_FLOW_ADVANCED_STORAGE_KEY, on ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    setTasks(props.tasks)
    tasksRef.current = props.tasks
    lastPersistedRef.current = props.tasks
  }, [props.tasks])
  useEffect(() => {
    tasksRef.current = tasks
  }, [tasks])

  const tasksForBoard = useMemo(
    () => (teamFilterActive ? tasks.filter((t) => t.team_id === teamFilterId) : tasks),
    [tasks, teamFilterActive, teamFilterId]
  )

  const statsTasks = teamFilterActive ? tasksForBoard : tasks

  const stageById = useMemo(() => Object.fromEntries(props.stages.map((s) => [s.id, s])), [props.stages])

  const boardStagesFromServer = useMemo(
    () =>
      [...props.stages]
        .filter((s) => !s.is_backlog)
        .sort((a, b) => a.stage_order - b.stage_order),
    [props.stages]
  )

  const boardStagesDataKey = useMemo(
    () => boardStagesFromServer.map((s) => `${s.id}:${s.stage_order}`).join('|'),
    [boardStagesFromServer]
  )

  useEffect(() => {
    setColumnOrder(null)
  }, [boardStagesDataKey])

  const boardStages = useMemo(() => {
    if (!columnOrder) return boardStagesFromServer
    const m = Object.fromEntries(boardStagesFromServer.map((s) => [s.id, s]))
    return columnOrder.map((id) => m[id]).filter(Boolean) as Stage[]
  }, [boardStagesFromServer, columnOrder])

  const boardStageIds = useMemo(() => new Set(boardStages.map((s) => s.id)), [boardStages])

  const backlogStageId = useMemo(() => props.stages.find((s) => s.is_backlog)?.id ?? null, [props.stages])

  const backlogStageEntity = useMemo(() => {
    if (!backlogStageId) return null
    return (
      props.stages.find((s) => s.id === backlogStageId) ?? {
        id: backlogStageId,
        name: 'Backlog',
        stage_order: -1,
        is_done: false,
        is_backlog: true,
      }
    )
  }, [props.stages, backlogStageId])

  const columns = useMemo(() => {
    const m: Record<string, string[]> = {}
    for (const s of boardStages) {
      m[s.id] = stageTaskIds(tasksForBoard, s.id)
    }
    if (backlogStageId) {
      m[backlogStageId] = stageTaskIds(tasksForBoard, backlogStageId)
    }
    return m
  }, [tasksForBoard, boardStages, backlogStageId])

  const totalBoardTasks = useMemo(
    () => statsTasks.filter((t) => boardStageIds.has(t.workflow_stage_id)).length,
    [statsTasks, boardStageIds]
  )

  /** Tasks on the board in non-terminal columns (incl. e.g. “To Do”) that are not completed. */
  const openNotDoneCount = useMemo(
    () =>
      statsTasks.filter((t) => {
        const st = stageById[t.workflow_stage_id]
        return st && boardStageIds.has(st.id) && !st.is_backlog && !st.is_done && !t.completed_at
      }).length,
    [statsTasks, stageById, boardStageIds]
  )

  const completedCount = useMemo(
    () =>
      statsTasks.filter((t) => {
        const st = stageById[t.workflow_stage_id]
        return st && boardStageIds.has(st.id) && (st.is_done || !!t.completed_at)
      }).length,
    [statsTasks, stageById, boardStageIds]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const persistColumnOrder = useCallback(
    async (orderedStageIds: string[]) => {
      setReorderingColumns(true)
      try {
        const res = await fetch(`/api/phases/${props.phaseId}/workflow-stages/reorder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderedStageIds }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json?.error || 'Failed to reorder columns')
        router.refresh()
      } catch (e) {
        console.error(e)
        setColumnOrder(null)
        alert(e instanceof Error ? e.message : 'Failed to reorder columns')
      } finally {
        setReorderingColumns(false)
      }
    },
    [props.phaseId, router]
  )

  const handleDetailSaved = useCallback(
    (row: TaskRowLite) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === row.id
            ? {
                ...t,
                title: row.title,
                description: row.description,
                priority: row.priority,
                story_points: row.story_points,
                workflow_stage_id: row.workflow_stage_id,
                completed_at: row.completed_at,
                position: row.position,
                current_stage_entered_at: row.current_stage_entered_at ?? t.current_stage_entered_at,
                size_band: row.size_band ?? t.size_band,
                service_class: row.service_class ?? t.service_class,
                team_id: row.team_id !== undefined ? row.team_id : t.team_id,
                assignee_id: row.assignee_id !== undefined ? row.assignee_id : t.assignee_id,
                blocked: row.blocked ?? t.blocked,
                blocked_reason: row.blocked_reason ?? t.blocked_reason,
                task_type: row.task_type ?? t.task_type,
              }
            : t
        )
      )
      router.refresh()
    },
    [router]
  )

  const flushPersistBoardChange = useCallback(async () => {
    if (persistInFlightRef.current) {
      persistQueuedRef.current = true
      return
    }
    persistInFlightRef.current = true
    setPersisting(true)
    try {
      const prev = lastPersistedRef.current
      const next = tasksRef.current

      const prevMap: Record<string, string[]> = {}
      const nextMap: Record<string, string[]> = {}
      for (const s of boardStages) {
        prevMap[s.id] = stageTaskIds(prev, s.id)
        nextMap[s.id] = stageTaskIds(next, s.id)
      }
      let prevBacklog = ''
      let nextBacklog = ''
      if (backlogStageId) {
        prevBacklog = stageTaskIds(prev, backlogStageId).join(',')
        nextBacklog = stageTaskIds(next, backlogStageId).join(',')
      }

      const moved = next.find((t) => {
        const p = prev.find((x) => x.id === t.id)
        return p && p.workflow_stage_id !== t.workflow_stage_id
      })

      if (moved) {
        const fromStageId = prev.find((t) => t.id === moved.id)!.workflow_stage_id
        const targetStage = stageById[moved.workflow_stage_id]
        const nextCompletedAt = targetStage?.is_done ? new Date().toISOString() : null

        await patchTask({
          id: moved.id,
          workflow_stage_id: moved.workflow_stage_id,
          completed_at: nextCompletedAt,
        })

        const sourceOrder = nextMap[fromStageId] ?? []
        const targetOrder = nextMap[moved.workflow_stage_id] ?? []
        const reorderPromises: Promise<unknown>[] = []
        if (sourceOrder.length > 0) {
          reorderPromises.push(reorderStage(props.projectId, props.processId, fromStageId, sourceOrder))
        }
        if (targetOrder.length > 0) {
          reorderPromises.push(
            reorderStage(props.projectId, props.processId, moved.workflow_stage_id, targetOrder)
          )
        }
        await Promise.all(reorderPromises)
      } else {
        const reorderPromises: Promise<unknown>[] = []
        for (const s of boardStages) {
          const a = prevMap[s.id].join(',')
          const b = nextMap[s.id].join(',')
          if (a !== b && nextMap[s.id].length > 0) {
            reorderPromises.push(reorderStage(props.projectId, props.processId, s.id, nextMap[s.id]))
          }
        }
        if (backlogStageId && prevBacklog !== nextBacklog && nextBacklog.length > 0) {
          reorderPromises.push(
            reorderStage(props.projectId, props.processId, backlogStageId, stageTaskIds(next, backlogStageId))
          )
        }
        await Promise.all(reorderPromises)
      }

      lastPersistedRef.current = next
    } catch (e) {
      console.error(e)
      const msg = e instanceof Error ? e.message : 'Could not update board'
      const wip = parseKanbanWipErrorMessage(msg, stageById, tasksRef.current)
      if (wip) setWipBlockedInfo(wip)
      else alert(msg)

      // Prefer server truth after an error rather than trying to rewind multiple rapid drags.
      router.refresh()
      lastPersistedRef.current = tasksRef.current
    } finally {
      setPersisting(false)
      persistInFlightRef.current = false

      if (persistQueuedRef.current) {
        persistQueuedRef.current = false
        void flushPersistBoardChange()
        return
      }

      // Revalidate RSC data after a short idle; avoids "refresh per drag".
      router.refresh()
    }
  }, [backlogStageId, boardStages, props.processId, props.projectId, router, stageById])

  const schedulePersistBoardChange = useCallback(() => {
    if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current)
    persistTimerRef.current = window.setTimeout(() => {
      void flushPersistBoardChange()
    }, 450)
  }, [flushPersistBoardChange])

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setActiveId(event.active.id)
      if (event.active.data.current?.type === 'column') {
        const sid = parseBoardColSortableId(String(event.active.id))
        setDraggingColumn(sid ? (stageById[sid] ?? null) : null)
      } else {
        setDraggingColumn(null)
      }
    },
    [stageById]
  )

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    setDraggingColumn(null)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)
      setDraggingColumn(null)
      if (!over) return

      if (active.data.current?.type === 'column') {
        const activeSid = parseBoardColSortableId(String(active.id))
        const overSid =
          parseBoardColSortableId(String(over.id)) ??
          (boardStageIds.has(String(over.id)) ? String(over.id) : null)
        if (!activeSid || !overSid) return
        const ids = boardStages.map((s) => s.id)
        const oldIndex = ids.indexOf(activeSid)
        const newIndex = ids.indexOf(overSid)
        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return
        const nextIds = arrayMove(ids, oldIndex, newIndex)
        setColumnOrder(nextIds)
        void persistColumnOrder(nextIds)
        return
      }

      const overStr = String(over.id)
      let overContainer = findContainer(over.id, columns)
      const overColFromSortable = parseBoardColSortableId(overStr)
      if (!overContainer && overColFromSortable && overColFromSortable in columns) {
        overContainer = overColFromSortable
      }
      if (!overContainer && boardStages.some((s) => s.id === overStr)) {
        overContainer = overStr
      }

      const activeContainer = findContainer(active.id, columns)
      if (!activeContainer || !overContainer) return

      const activeTaskId = String(active.id)
      const prev = tasks

      const overIsColumn =
        boardStages.some((s) => s.id === overStr) || overColFromSortable !== null

      if (activeContainer === overContainer) {
        const items = [...columns[activeContainer]]
        const oldIndex = items.indexOf(activeTaskId)
        const newIndex = overIsColumn ? items.length - 1 : items.indexOf(overStr)
        if (oldIndex < 0 || newIndex < 0) return
        if (!overIsColumn && oldIndex === newIndex) return

        const nextOrder = arrayMove(items, oldIndex, newIndex)
        const nextColumns = { ...columns, [activeContainer]: nextOrder }
        const next = applyColumnOrders(tasks, nextColumns, stageById)
        setTasks(next)
        schedulePersistBoardChange()
        return
      }

      if (isMoveBlockedByWip(tasks, overContainer, activeTaskId, stageById)) {
        const st = stageById[overContainer]
        if (st && st.wip_limit != null) {
          setWipBlockedInfo({
            stageName: st.name,
            limit: st.wip_limit,
            openCount: countOpenWipTasksInStage(tasks, overContainer, activeTaskId),
          })
        }
        return
      }

      const sourceIds = columns[activeContainer].filter((id) => id !== activeTaskId)
      let targetIds = [...columns[overContainer]]

      if (overIsColumn) {
        targetIds = targetIds.filter((id) => id !== activeTaskId)
        targetIds.push(activeTaskId)
      } else {
        const overIdx = targetIds.indexOf(overStr)
        if (overIdx < 0) return
        targetIds = targetIds.filter((id) => id !== activeTaskId)
        targetIds.splice(overIdx, 0, activeTaskId)
      }

      const nextColumns = {
        ...columns,
        [activeContainer]: sourceIds,
        [overContainer]: targetIds,
      }
      const next = applyColumnOrders(tasks, nextColumns, stageById)
      setTasks(next)
      schedulePersistBoardChange()
    },
    [
      boardStageIds,
      boardStages,
      columns,
      schedulePersistBoardChange,
      persistColumnOrder,
      stageById,
      tasks,
    ]
  )

  const activeTask = activeId ? tasks.find((t) => t.id === String(activeId)) : null

  const backlogHref = `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/processes/${props.processId}/backlog`

  const tasksInStage = useCallback(
    (stageId: string) => tasks.filter((t) => t.workflow_stage_id === stageId).length,
    [tasks]
  )

  const handleCreateBacklogTask = async () => {
    if (!backlogStageId) return
    const title = backlogCreateTitle.trim()
    if (!title) return

    const desc = backlogCreateDescription.trim()

    setBacklogCreateLoading(true)
    try {
      const body: Record<string, unknown> = {
        project_id: props.projectId,
        process_id: props.processId,
        workflow_stage_id: backlogStageId,
        title,
        priority: backlogCreatePriority,
        story_points: null,
        description: desc.length > 0 ? desc : null,
        sprint_id: null,
      }
      if (showAdvancedFlowFields) {
        body.size_band = backlogCreateSize.trim() || null
        body.service_class = backlogCreateService || 'standard'
      }
      body.task_type = backlogCreateTaskType || 'task'

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to create task')

      setBacklogCreateOpen(false)
      setBacklogCreateTitle('')
      setBacklogCreateDescription('')
      setBacklogCreatePriority('medium')
      setBacklogCreateSize('')
      setBacklogCreateService('standard')
      setBacklogCreateTaskType('task')
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create task')
    } finally {
      setBacklogCreateLoading(false)
    }
  }

  const saveWipLimit = async () => {
    if (!wipEditStage) return
    setWipSaving(true)
    try {
      const trimmed = wipEditValue.trim()
      let wipLimit: number | null
      if (trimmed === '') {
        wipLimit = null
      } else {
        const n = Math.floor(Number(trimmed))
        if (!Number.isFinite(n) || n < 1) {
          alert('Enter a positive number, or leave empty for no limit.')
          setWipSaving(false)
          return
        }
        wipLimit = n
      }
      const res = await fetch(`/api/workflow-stages/${wipEditStage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wipLimit }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to update WIP')

      setWipEditStage(null)
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update WIP')
    } finally {
      setWipSaving(false)
    }
  }

  const handleAddColumn = async () => {
    const name = newColumnName.trim()
    if (!name) return
    setColumnMutation(true)
    try {
      let wipPayload: number | null | undefined = undefined
      const w = newColumnWip.trim()
      if (w.length > 0) {
        const n = Number(w)
        if (!Number.isFinite(n) || n < 1) {
          alert('WIP limit must be a positive number or left blank.')
          setColumnMutation(false)
          return
        }
        wipPayload = Math.floor(n)
      }

      const res = await fetch(`/api/phases/${props.phaseId}/workflow-stages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, wipLimit: wipPayload }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to add column')

      setAddOpen(false)
      setNewColumnName('')
      setNewColumnWip('')
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to add column')
    } finally {
      setColumnMutation(false)
    }
  }

  const deleteTargets = useMemo(() => {
    if (!deleteStage) return [] as Stage[]
    return [...props.stages]
      .filter((s) => s.id !== deleteStage.id)
      .sort((a, b) => a.stage_order - b.stage_order)
  }, [deleteStage, props.stages])

  useEffect(() => {
    if (!deleteStage) {
      setDeleteMoveTargetId('')
      return
    }
    const list = [...props.stages].filter((s) => s.id !== deleteStage.id).sort((a, b) => a.stage_order - b.stage_order)
    const count = tasksInStage(deleteStage.id)
    if (count > 0 && list.length > 0) {
      setDeleteMoveTargetId((prev) => (prev && list.some((s) => s.id === prev) ? prev : list[0].id))
    } else {
      setDeleteMoveTargetId('')
    }
  }, [deleteStage, props.stages, tasksInStage])

  const handleConfirmDeleteColumn = async () => {
    if (!deleteStage) return
    const count = tasksInStage(deleteStage.id)
    if (count > 0 && !deleteMoveTargetId) {
      alert('Choose a column to move tasks into.')
      return
    }

    setColumnMutation(true)
    try {
      const res = await fetch(`/api/workflow-stages/${deleteStage.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          count > 0 ? { moveTasksToStageId: deleteMoveTargetId } : {}
        ),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to delete column')

      setDeleteStage(null)
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete column')
    } finally {
      setColumnMutation(false)
    }
  }

  const openTaskDetail = useCallback((task: TaskRow) => {
    setDetailTaskId(task.id)
  }, [])

  return (
    <TooltipProvider delayDuration={250}>
      <div className="space-y-6">
      <KanbanTaskDetailModal
        taskId={detailTaskId}
        open={detailTaskId !== null}
        onOpenChange={(o) => {
          if (!o) setDetailTaskId(null)
        }}
        onTaskSaved={handleDetailSaved}
        flowAdvancedFields={showAdvancedFlowFields}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(
          [
            {
              label: 'On board',
              value: String(totalBoardTasks),
              color: 'text-gray-900',
              tip: 'Work items on this Kanban process in any column (including backlog when shown on this page).',
            },
            {
              label: 'Open (not done)',
              value: String(openNotDoneCount),
              color: 'text-blue-600',
              tip: 'Items still in progress — not in a done column and not marked completed.',
            },
            {
              label: 'Done',
              value: String(completedCount),
              color: 'text-green-600',
              tip: 'Items completed on this process (done column or completed timestamp).',
            },
          ] as const
        ).map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-1 mb-1">
              <p className="text-xs font-medium text-gray-500">{stat.label}</p>
              <HelpTip label={`About ${stat.label}`}>{stat.tip}</HelpTip>
            </div>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-1 mb-1">
            <p className="text-xs font-medium text-gray-500">Throughput (7 days)</p>
            <HelpTip label="About throughput">
              Count of items completed on this process in the last 7 days — a simple flow signal, not weighted by
              estimate.
            </HelpTip>
          </div>
          <p className="text-2xl font-bold text-gray-900">{flowMetrics.throughput7d}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-1 mb-1">
            <p className="text-xs font-medium text-gray-500">Avg lead time (30 days)</p>
            <HelpTip label="About average lead time">
              Average calendar days from created → completed for tasks that finished in the last 30 days on this
              process (observed, not estimated).
            </HelpTip>
          </div>
          <p className="text-2xl font-bold text-indigo-600 tabular-nums">
            {flowMetrics.avgLeadTimeDays30d != null ? `${flowMetrics.avgLeadTimeDays30d.toFixed(1)} days` : '—'}
          </p>
        </div>
      </div>

      <Card className="border-gray-100 shadow-sm">
        <CardHeader className="flex flex-col gap-2 pb-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg">Kanban board</CardTitle>
              <HelpTip label="Board tips">
                <div className="space-y-2">
                  <p>Drag cards between columns. Drag the grip on a column header to reorder columns.</p>
                  <p>
                    Card footers show time in the current column. Enable <strong>Advanced</strong> below for optional
                    T‑shirt size and class of service on cards and in task details.
                  </p>
                  <p>This process does not use story points — use throughput and average lead time for flow health.</p>
                </div>
              </HelpTip>
              <Badge variant="secondary" className="text-xs font-normal text-gray-600">
                Kanban
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {persisting ? (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </span>
              ) : null}
              {reorderingColumns ? (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Reordering columns…
                </span>
              ) : null}
            </div>
          </div>
          <p className="text-sm text-gray-500">Drag cards to move work; use column grips to reorder.</p>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between rounded-lg border border-gray-100 bg-slate-50/90 p-3">
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
              {teamsList.length > 0 ? (
                <div className="grid gap-1.5">
                  <span className="text-xs font-medium text-gray-600">Filter by team</span>
                  <Select
                    value={teamFilterId || '__all__'}
                    onValueChange={(v) => setTeamFilter(v === '__all__' ? '' : v)}
                  >
                    <SelectTrigger className="h-9 w-[220px] bg-white">
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
                  {teamFilterActive ? (
                    <p className="max-w-md text-xs text-amber-800">
                      Team filter on — card drag-and-drop is paused until you show all teams.
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="flex items-start gap-1.5">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={showAdvancedFlowFields}
                    onChange={(e) => persistAdvancedFlowFields(e.target.checked)}
                  />
                  Advanced: size &amp; class of service
                </label>
                <HelpTip label="Advanced fields">
                  Optional T‑shirt size and class of service for Kanban policy. Off by default; existing values stay
                  saved when hidden.
                </HelpTip>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
              <Button variant="outline" size="sm" asChild>
                <Link href={backlogHref} className="inline-flex items-center gap-1">
                  <LayoutList className="h-4 w-4" />
                  Backlog
                </Link>
              </Button>
            </div>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add board column</DialogTitle>
                <DialogDescription>
                  Adds a workflow stage at the end of the board. Backlog stays on the product backlog page unless you
                  manage backlog stages separately.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="kanban-col-name">Column name</Label>
                  <Input
                    id="kanban-col-name"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    placeholder="e.g. Review, Testing"
                    autoFocus
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="kanban-col-wip">WIP limit (optional)</Label>
                  <Input
                    id="kanban-col-wip"
                    type="number"
                    min={1}
                    value={newColumnWip}
                    onChange={(e) => setNewColumnWip(e.target.value)}
                    placeholder="Leave empty for no limit"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => void handleAddColumn()} disabled={columnMutation}>
                  {columnMutation ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add column'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!deleteStage} onOpenChange={(open) => !open && setDeleteStage(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Remove column</DialogTitle>
                <DialogDescription>
                  {deleteStage ? (
                    <>
                      Remove <span className="font-medium text-gray-900">{deleteStage.name}</span>
                      {tasksInStage(deleteStage.id) > 0
                        ? `. ${tasksInStage(deleteStage.id)} task(s) must move to another column.`
                        : '. This column is empty.'}
                      {deleteStage.is_backlog ? (
                        <span className="block mt-2">
                          This was the backlog column — another stage will be marked as backlog automatically if needed.
                        </span>
                      ) : null}
                      {deleteStage.is_done ? (
                        <span className="block mt-2">
                          This was a “done” column — another stage will be marked done automatically if needed.
                        </span>
                      ) : null}
                    </>
                  ) : null}
                </DialogDescription>
              </DialogHeader>
              {deleteStage && tasksInStage(deleteStage.id) > 0 ? (
                <div className="grid gap-2 py-2">
                  <Label>Move tasks to</Label>
                  <Select value={deleteMoveTargetId} onValueChange={setDeleteMoveTargetId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose column" />
                    </SelectTrigger>
                    <SelectContent>
                      {deleteTargets.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                          {s.is_backlog ? ' (backlog)' : ''}
                          {s.is_done ? ' (done)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setDeleteStage(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void handleConfirmDeleteColumn()}
                  disabled={columnMutation || (tasksInStage(deleteStage?.id ?? '') > 0 && !deleteMoveTargetId)}
                >
                  {columnMutation ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remove column'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={!!wipEditStage}
            onOpenChange={(open) => {
              if (!open) setWipEditStage(null)
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>WIP limit{wipEditStage ? `: ${wipEditStage.name}` : ''}</DialogTitle>
                <DialogDescription>
                  Maximum work items in this column (not counting done). Leave empty to remove the cap.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 py-2">
                <Label htmlFor="wip-edit">WIP limit</Label>
                <Input
                  id="wip-edit"
                  type="number"
                  min={1}
                  value={wipEditValue}
                  onChange={(e) => setWipEditValue(e.target.value)}
                  placeholder="No limit"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setWipEditStage(null)}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => void saveWipLimit()} disabled={wipSaving}>
                  {wipSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={wipBlockedInfo !== null}
            onOpenChange={(open) => {
              if (!open) setWipBlockedInfo(null)
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Column is at its WIP limit</DialogTitle>
                <DialogDescription>
                  {wipBlockedInfo ? (
                    <>
                      “{wipBlockedInfo.stageName}” allows at most {wipBlockedInfo.limit} incomplete item
                      {wipBlockedInfo.limit === 1 ? '' : 's'}. It already has {wipBlockedInfo.openCount}. Finish or move
                      a card out, or edit the column WIP limit, then try again.
                    </>
                  ) : null}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" onClick={() => setWipBlockedInfo(null)}>
                  OK
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={backlogCreateOpen} onOpenChange={setBacklogCreateOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add work item to backlog</DialogTitle>
                <DialogDescription>
                  Capture what needs doing and any context. Pull the card onto the board when you start the work — Kanban
                  uses flow and WIP limits, not sprint estimates.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="bl-title">Title</Label>
                  <Input
                    id="bl-title"
                    value={backlogCreateTitle}
                    onChange={(e) => setBacklogCreateTitle(e.target.value)}
                    placeholder="Short, actionable summary"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bl-desc">Description (recommended)</Label>
                  <Textarea
                    id="bl-desc"
                    value={backlogCreateDescription}
                    onChange={(e) => setBacklogCreateDescription(e.target.value)}
                    placeholder="Acceptance criteria, links, constraints, or notes for whoever pulls this next."
                    className="min-h-[100px] resize-y"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bl-type">Work type</Label>
                  <select
                    id="bl-type"
                    className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                    value={backlogCreateTaskType}
                    onChange={(e) => setBacklogCreateTaskType(e.target.value)}
                  >
                    {TASK_TYPES.map((tt) => (
                      <option key={tt} value={tt}>
                        {TASK_TYPE_META[tt].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bl-priority">Priority</Label>
                  <select
                    id="bl-priority"
                    className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                    value={backlogCreatePriority}
                    onChange={(e) =>
                      setBacklogCreatePriority(e.target.value as 'low' | 'medium' | 'high' | 'critical')
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                {showAdvancedFlowFields ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="bl-size">Size (optional)</Label>
                      <select
                        id="bl-size"
                        className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                        value={backlogCreateSize}
                        onChange={(e) => setBacklogCreateSize(e.target.value)}
                      >
                        <option value="">— None —</option>
                        <option value="xs">XS</option>
                        <option value="s">S</option>
                        <option value="m">M</option>
                        <option value="l">L</option>
                        <option value="xl">XL</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="bl-svc">Class of service</Label>
                      <select
                        id="bl-svc"
                        className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                        value={backlogCreateService}
                        onChange={(e) => setBacklogCreateService(e.target.value)}
                      >
                        <option value="standard">Standard</option>
                        <option value="fixed_date">Fixed date</option>
                        <option value="expedite">Expedite</option>
                      </select>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Used when the card is on the board: standard work vs deadline-sensitive (fixed date) vs expedite
                        (team policy—often “interrupt” lanes). It does not bypass WIP limits unless you configure rules
                        that do.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setBacklogCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleCreateBacklogTask()}
                  disabled={backlogCreateLoading || !backlogCreateTitle.trim()}
                >
                  {backlogCreateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {boardStages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 p-8 text-center space-y-3">
              <p className="text-sm text-gray-600">
                No board columns yet — stages may be backlog-only, or none configured. Add a column to visualize flow on
                this Kanban board.
              </p>
              <Button size="sm" className="gap-1" onClick={() => setAddOpen(true)} disabled={columnMutation}>
                <Plus className="h-4 w-4" />
                Add your first column
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <SortableContext
                items={boardStages.map((s) => boardColSortableId(s.id))}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex gap-2 overflow-x-auto pb-6 items-stretch">
                  {boardStages.map((stage) => {
                    const colTasks = tasksForBoard
                      .filter((t) => t.workflow_stage_id === stage.id && boardStageIds.has(stage.id))
                      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

                    return (
                      <SortableKanbanColumn
                        key={stage.id}
                        stage={stage}
                        tasksInColumn={colTasks}
                        stageById={stageById}
                        disabled={columnMutation || reorderingColumns || teamFilterActive}
                        onRequestDelete={() => setDeleteStage(stage)}
                        onEditWip={() => {
                          setWipEditStage(stage)
                          setWipEditValue(stage.wip_limit != null ? String(stage.wip_limit) : '')
                        }}
                        onOpenTask={openTaskDetail}
                        teamsList={teamsList}
                        showFlowAdvanced={showAdvancedFlowFields}
                      />
                    )
                  })}
                  <AddColumnTrigger
                    onClick={() => setAddOpen(true)}
                    disabled={columnMutation || reorderingColumns}
                  />
                </div>
              </SortableContext>

              {backlogStageId ? (
                <div className="mt-8 border-t border-gray-100 pt-6 space-y-3">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Product backlog</h3>
                      <p className="text-xs text-gray-500 mt-0.5 inline-flex flex-wrap items-center gap-1">
                        <span>Queued work for this process.</span>
                        <Link href={backlogHref} className="text-blue-600 hover:underline font-medium">
                          Full backlog page
                        </Link>
                        <HelpTip label="About this strip">
                          Add tasks here or drag cards back from the board. For bulk edits and filters, open the full
                          backlog page.
                        </HelpTip>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="gap-1"
                        onClick={() => setBacklogCreateOpen(true)}
                        disabled={columnMutation || reorderingColumns}
                      >
                        <Plus className="h-4 w-4" />
                        Add task
                      </Button>
                    </div>
                  </div>
                  <BacklogDropZone stageId={backlogStageId}>
                    {(() => {
                      const backlogTasks = tasksForBoard
                        .filter((t) => t.workflow_stage_id === backlogStageId)
                        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                      const backlogIds = backlogTasks.map((t) => t.id)
                      return (
                        <SortableContext items={backlogIds} strategy={horizontalListSortingStrategy}>
                          <div className="flex gap-3 overflow-x-auto pb-1 min-h-[88px]">
                            {backlogStageEntity
                              ? backlogTasks.map((task) => (
                                  <div key={task.id} className="min-w-[260px] max-w-[280px] shrink-0">
                                    <SortableCard
                                      task={task}
                                      stage={backlogStageEntity}
                                      disabled={columnMutation || reorderingColumns || teamFilterActive}
                                      onOpen={openTaskDetail}
                                      teamsList={teamsList}
                                      showFlowAdvanced={showAdvancedFlowFields}
                                    />
                                  </div>
                                ))
                              : null}
                            {backlogTasks.length === 0 ? (
                              <p className="text-xs text-gray-400 py-6 px-2 inline-flex flex-wrap items-center gap-1">
                                <span>Nothing here yet — add a task or drag cards from the board.</span>
                                <HelpTip label="Backlog strip">
                                  Use <span className="font-medium">Add task</span> for a quick create, or the full
                                  backlog page for search and team filters.
                                </HelpTip>
                              </p>
                            ) : null}
                          </div>
                        </SortableContext>
                      )
                    })()}
                  </BacklogDropZone>
                </div>
              ) : null}

              <DragOverlay dropAnimation={null}>
                {draggingColumn ? (
                  <div className="min-w-[280px] bg-white p-3 rounded-xl border border-indigo-200 shadow-lg opacity-95">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                      <GripVertical className="h-4 w-4 text-gray-400 shrink-0" aria-hidden />
                      {draggingColumn.name}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Column</p>
                  </div>
                ) : activeTask ? (
                  <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-lg opacity-95 max-w-xs">
                    <p className="text-xs font-semibold text-gray-800">{activeTask.title}</p>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  )
}

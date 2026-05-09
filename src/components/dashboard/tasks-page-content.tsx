'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { format, formatDistanceToNow } from 'date-fns'
import {
  CheckSquare,
  ExternalLink,
  Layers,
  Link2,
  Loader2,
  Search,
  User,
  Calendar,
  Tag,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TaskPriority, TaskStatus } from '@/types'
import { cn } from '@/lib/utils'
import { mapStageToStatus } from '@/lib/tasks/map-stage-to-status'
import { KanbanTaskDetailModal, type TaskRowLite } from '@/components/project/KanbanTaskDetailModal'

type ApiTaskRow = {
  id: string
  title: string
  description?: string | null
  priority: TaskPriority
  project_id: string
  process_id?: string | null
  workflow_stage_id?: string | null
  assignee_id?: string | null
  blocked?: boolean | null
  completed_at?: string | null
  created_at: string
  updated_at: string
  due_date?: string | null
  project?: { id: string; name: string } | null
  workflow_stage?: { id: string; name: string; is_done: boolean; is_backlog: boolean } | null
  phase_process?: { id: string; phase_id: string } | null
}

type WorkItem = {
  id: string
  key: string
  type: 'task'
  summary: string
  description: string
  status: TaskStatus
  stageLabel: string
  priority: TaskPriority
  assignee: { name: string; initials: string }
  project: string
  projectId: string
  phaseId: string | null
  processId: string | null
  updatedAt: Date
  createdAt: Date
  dueDate?: Date
}

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done', 'blocked']

const statusLabel: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
  blocked: 'Blocked',
}

const statusStyle: Record<TaskStatus, string> = {
  todo: 'bg-slate-100 text-slate-800 border-slate-200',
  in_progress: 'bg-blue-50 text-blue-800 border-blue-200',
  in_review: 'bg-purple-50 text-purple-800 border-purple-200',
  done: 'bg-green-50 text-green-800 border-green-200',
  blocked: 'bg-red-50 text-red-800 border-red-200',
}

const priorityLabel: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

const priorityStyle: Record<TaskPriority, string> = {
  low: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  medium: 'text-amber-800 bg-amber-50 border-amber-200',
  high: 'text-orange-800 bg-orange-50 border-orange-200',
  critical: 'text-red-800 bg-red-50 border-red-200',
}

function taskKey(id: string) {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase()
}

function mapApiToWorkItem(row: ApiTaskRow): WorkItem {
  const status = mapStageToStatus(row.workflow_stage ?? null, row.completed_at ?? null, Boolean(row.blocked))
  const stageLabel = row.workflow_stage?.name?.trim() || statusLabel[status]
  return {
    id: row.id,
    key: taskKey(row.id),
    type: 'task',
    summary: row.title?.trim() || 'Untitled',
    description: row.description?.trim() ?? '',
    status,
    stageLabel,
    priority: row.priority ?? 'medium',
    assignee: { name: 'You', initials: 'ME' },
    project: row.project?.name ?? 'Project',
    projectId: row.project_id,
    phaseId: row.phase_process?.phase_id ?? null,
    processId: row.process_id ?? null,
    updatedAt: new Date(row.updated_at),
    createdAt: new Date(row.created_at),
    dueDate: row.due_date ? new Date(row.due_date) : undefined,
  }
}

export function TasksPageContent() {
  const searchParams = useSearchParams()
  const [items, setItems] = useState<WorkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [projectId, setProjectId] = useState('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)

  const loadTasks = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch('/api/tasks?assignee=me')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to load tasks')
      const raw = (json.data ?? []) as ApiTaskRow[]
      setItems(raw.map(mapApiToWorkItem))
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load tasks')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  const projectOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of items) {
      if (t.projectId) map.set(t.projectId, t.project)
    }
    return [{ id: 'all', name: 'All projects' }, ...[...map.entries()].map(([id, name]) => ({ id, name }))]
  }, [items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((t) => {
      if (projectId !== 'all' && t.projectId !== projectId) return false
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (!q) return true
      return (
        t.key.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.project.toLowerCase().includes(q) ||
        t.stageLabel.toLowerCase().includes(q)
      )
    })
  }, [items, query, statusFilter, projectId])

  const selected = items.find((t) => t.id === selectedId) ?? null
  const selectedInView = selected ? filtered.some((t) => t.id === selectedId) : false

  const boardHref =
    selected?.projectId && selected.phaseId && selected.processId
      ? `/dashboard/projects/${selected.projectId}/phases/${selected.phaseId}/processes/${selected.processId}/board`
      : null

  useEffect(() => {
    const tid = searchParams.get('task')
    if (tid && /^[0-9a-f-]{36}$/i.test(tid)) {
      setSelectedId(tid)
      setDetailTaskId(tid)
    }
  }, [searchParams])

  const selectRow = useCallback((id: string) => {
    setSelectedId(id)
  }, [])

  const openDetailModal = useCallback((id: string) => {
    setSelectedId(id)
    setDetailTaskId(id)
  }, [])

  const handleDetailSaved = useCallback((_row: TaskRowLite) => {
    void loadTasks()
  }, [loadTasks])

  const copyTaskLink = useCallback(async () => {
    if (!selected) return
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/tasks?task=${selected.id}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      /* ignore */
    }
  }, [selected])

  return (
    <div className="flex flex-col gap-4 max-w-[1600px] mx-auto pb-10 min-h-[calc(100vh-8rem)]">
      <KanbanTaskDetailModal
        taskId={detailTaskId}
        open={detailTaskId !== null}
        onOpenChange={(o) => {
          if (!o) setDetailTaskId(null)
        }}
        onTaskSaved={handleDetailSaved}
        flowAdvancedFields
      />

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Tasks</h1>
        <p className="mt-2 text-gray-600 max-w-3xl">
          Work assigned to you across projects. Select a row to preview on the right — use{' '}
          <strong>View / edit details</strong> for the full editor, comments, and fields. Share a direct link with the{' '}
          <strong>Copy link</strong> button.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-0 lg:min-h-[560px] rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col flex-1 min-w-0 min-h-0 border-b lg:border-b-0 lg:border-r border-gray-200">
          <div className="p-4 border-b border-gray-100 bg-gray-50/80 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search title, project, stage, key…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9 h-9 border-gray-200 bg-white"
                />
              </div>
              {loading ? (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading…
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-full sm:w-[220px] h-9 border-gray-200 bg-white text-sm">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  {projectOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px] h-9 border-gray-200 bg-white text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabel[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}
          </div>

          <div className="overflow-x-auto overflow-y-auto flex-1 max-h-[55vh] lg:max-h-none">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-white text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2.5 w-10" aria-hidden />
                  <th className="px-3 py-2.5 whitespace-nowrap">Key</th>
                  <th className="px-3 py-2.5 min-w-[200px]">Summary</th>
                  <th className="px-3 py-2.5 whitespace-nowrap hidden md:table-cell">Stage</th>
                  <th className="px-3 py-2.5 whitespace-nowrap hidden lg:table-cell">Priority</th>
                  <th className="px-3 py-2.5 whitespace-nowrap hidden xl:table-cell">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const active = t.id === selectedId
                  return (
                    <tr
                      key={t.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectRow(t.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          selectRow(t.id)
                        }
                      }}
                      className={cn(
                        'border-b border-gray-100 cursor-pointer transition-colors',
                        active
                          ? 'bg-blue-50/90 border-l-4 border-l-blue-600'
                          : 'border-l-4 border-l-transparent hover:bg-gray-50'
                      )}
                    >
                      <td className="px-3 py-2 align-middle">
                        <Layers className="h-4 w-4 text-gray-500" aria-hidden />
                      </td>
                      <td className="px-3 py-2 align-middle whitespace-nowrap">
                        <span className="font-mono text-xs font-medium text-blue-600">{t.key}</span>
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <span className="text-gray-900 font-medium line-clamp-2">{t.summary}</span>
                        <span className="block text-xs text-gray-500 mt-0.5 lg:hidden">
                          {t.stageLabel} · {priorityLabel[t.priority]}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-middle hidden md:table-cell">
                        <Badge variant="outline" className={cn('font-normal text-xs max-w-[180px] truncate', statusStyle[t.status])} title={t.stageLabel}>
                          {t.stageLabel}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 align-middle hidden lg:table-cell">
                        <span
                          className={cn(
                            'inline-flex rounded border px-2 py-0.5 text-xs font-medium',
                            priorityStyle[t.priority]
                          )}
                        >
                          {priorityLabel[t.priority]}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-middle hidden xl:table-cell text-gray-500 whitespace-nowrap">
                        {formatDistanceToNow(t.updatedAt, { addSuffix: true })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!loading && filtered.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-12 px-4">
                {items.length === 0
                  ? 'No tasks are assigned to you yet. When someone assigns you work, it will show up here.'
                  : 'No tasks match your filters.'}
              </p>
            )}
          </div>
        </div>

        <aside className="w-full lg:w-[min(100%,420px)] xl:w-[460px] shrink-0 bg-gray-50 border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col max-h-[65vh] lg:max-h-none">
          {selected && selectedInView ? (
            <>
              <div className="p-4 border-b border-gray-200 bg-white space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <span className="truncate">{selected.project}</span>
                    </div>
                    <p className="font-mono text-xs font-medium text-blue-600 mb-1">{selected.key}</p>
                    <h2 className="text-lg font-semibold text-gray-900 leading-snug">{selected.summary}</h2>
                  </div>
                  <Badge variant="outline" className={cn('shrink-0 text-xs max-w-[140px] truncate', statusStyle[selected.status])} title={selected.stageLabel}>
                    {selected.stageLabel}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium',
                      priorityStyle[selected.priority]
                    )}
                  >
                    Priority · {priorityLabel[selected.priority]}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button size="sm" className="flex-1" type="button" onClick={() => openDetailModal(selected.id)}>
                    View / edit details
                  </Button>
                  {boardHref ? (
                    <Button size="sm" variant="outline" className="flex-1 border-gray-200" asChild>
                      <Link href={boardHref} className="inline-flex items-center justify-center gap-1">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open board
                      </Link>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="flex-1 border-gray-200" disabled title="Missing process link on this task">
                      Open board
                    </Button>
                  )}
                </div>
              </div>
              <div className="p-4 space-y-6 overflow-y-auto flex-1">
                {selected.description ? (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Description</h3>
                    <div className="rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {selected.description}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No description on this task. Add one in details.</p>
                )}

                <Card className="border-gray-200 shadow-none">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-medium text-gray-900">Details</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3 text-sm">
                    <div className="flex gap-3">
                      <User className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Assignee</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-xs bg-gray-200 text-gray-700">ME</AvatarFallback>
                          </Avatar>
                          <span className="text-gray-900">You</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Calendar className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Dates</p>
                        <p className="text-gray-800 mt-0.5">Created {format(selected.createdAt, 'MMM d, yyyy')}</p>
                        <p className="text-gray-800">
                          Updated {format(selected.updatedAt, 'MMM d, yyyy · h:mm a')}
                        </p>
                        {selected.dueDate && (
                          <p className="text-gray-800 mt-1">
                            Due{' '}
                            <span className="font-medium text-amber-900">
                              {format(selected.dueDate, 'MMM d, yyyy')}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Tag className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Comments &amp; activity</p>
                        <p className="text-gray-700 mt-1 text-sm">
                          Open <strong>View / edit details</strong> for comments and full fields.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="border-gray-200 flex-1" type="button" onClick={() => void copyTaskLink()}>
                    <Link2 className="h-3.5 w-3.5 mr-1.5" />
                    Copy link
                  </Button>
                </div>
              </div>
            </>
          ) : selected && !selectedInView ? (
            <div className="p-6 flex flex-col items-center justify-center text-center flex-1 text-gray-500">
              <p className="text-sm">Selected task is hidden by filters.</p>
              <Button variant="link" className="mt-2 text-blue-600" onClick={() => setStatusFilter('all')}>
                Clear status filter
              </Button>
            </div>
          ) : (
            <div className="p-8 flex flex-col items-center justify-center text-center flex-1 text-gray-500">
              <CheckSquare className="h-12 w-12 text-gray-300 mb-3" />
              <p className="font-medium text-gray-700">Select a task</p>
              <p className="text-sm mt-1 max-w-xs">Click a row to preview, then open details to edit or comment.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

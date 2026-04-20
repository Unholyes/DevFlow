'use client'

import { useMemo, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Bug,
  CheckSquare,
  Layers,
  Search,
  SlidersHorizontal,
  User,
  Calendar,
  Tag,
  MessageSquare,
  Link2,
  ChevronRight,
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

type IssueType = 'story' | 'task' | 'bug'

type WorkItem = {
  id: string
  key: string
  type: IssueType
  summary: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assignee: { name: string; initials: string }
  project: string
  projectId: string
  updatedAt: Date
  createdAt: Date
  dueDate?: Date
  labels: string[]
}

const STATUS_ORDER: TaskStatus[] = [
  'todo',
  'in_progress',
  'in_review',
  'done',
  'blocked',
]

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

const typeIcon: Record<IssueType, typeof Bug> = {
  story: Layers,
  task: CheckSquare,
  bug: Bug,
}

const typeLabel: Record<IssueType, string> = {
  story: 'Story',
  task: 'Task',
  bug: 'Bug',
}

function buildMockItems(): WorkItem[] {
  return []
}

const projects = [
  { id: 'all', name: 'All projects' },
]

export function TasksPageContent() {
  const items = useMemo(() => buildMockItems(), [])
  const [query, setQuery] = useState('')
  const [projectId, setProjectId] = useState('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null)

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
        t.assignee.name.toLowerCase().includes(q)
      )
    })
  }, [items, query, projectId, statusFilter])

  const selected = items.find((t) => t.id === selectedId) ?? null
  const selectedInView = filtered.some((t) => t.id === selectedId)

  return (
    <div className="flex flex-col gap-4 max-w-[1600px] mx-auto pb-10 min-h-[calc(100vh-8rem)]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Tasks</h1>
        <p className="mt-2 text-gray-600 max-w-3xl">
          Browse and inspect work items across projects—similar to Jira&apos;s issue navigator. Select a
          row to open the detail panel.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-0 lg:min-h-[560px] rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* List pane */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0 border-b lg:border-b-0 lg:border-r border-gray-200">
          <div className="p-4 border-b border-gray-100 bg-gray-50/80 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search summary, key, assignee…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9 h-9 border-gray-200 bg-white"
                />
              </div>
              <Button variant="outline" size="sm" className="border-gray-200 shrink-0">
                <SlidersHorizontal className="h-4 w-4 mr-1.5" />
                More filters
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-full sm:w-[220px] h-9 border-gray-200 bg-white text-sm">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
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
          </div>

          <div className="overflow-x-auto overflow-y-auto flex-1 max-h-[55vh] lg:max-h-none">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-white text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2.5 w-10" aria-hidden />
                  <th className="px-3 py-2.5 whitespace-nowrap">Key</th>
                  <th className="px-3 py-2.5 min-w-[200px]">Summary</th>
                  <th className="px-3 py-2.5 whitespace-nowrap hidden md:table-cell">Status</th>
                  <th className="px-3 py-2.5 whitespace-nowrap hidden lg:table-cell">Priority</th>
                  <th className="px-3 py-2.5 whitespace-nowrap hidden xl:table-cell">Assignee</th>
                  <th className="px-3 py-2.5 whitespace-nowrap hidden xl:table-cell">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const TypeIcon = typeIcon[t.type]
                  const active = t.id === selectedId
                  return (
                    <tr
                      key={t.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedId(t.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedId(t.id)
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
                        <TypeIcon className="h-4 w-4 text-gray-500" aria-hidden />
                      </td>
                      <td className="px-3 py-2 align-middle whitespace-nowrap">
                        <span className="font-mono text-xs font-medium text-blue-700">{t.key}</span>
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <span className="text-gray-900 font-medium line-clamp-2">{t.summary}</span>
                        <span className="block text-xs text-gray-500 mt-0.5 lg:hidden">
                          {statusLabel[t.status]} · {priorityLabel[t.priority]}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-middle hidden md:table-cell">
                        <Badge
                          variant="outline"
                          className={cn('font-normal text-xs', statusStyle[t.status])}
                        >
                          {statusLabel[t.status]}
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
                      <td className="px-3 py-2 align-middle hidden xl:table-cell">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px] bg-gray-200 text-gray-700">
                              {t.assignee.initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-gray-700 truncate max-w-[120px]">{t.assignee.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-middle hidden xl:table-cell text-gray-500 whitespace-nowrap">
                        {formatDistanceToNow(t.updatedAt, { addSuffix: true })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-12 px-4">No issues match your filters.</p>
            )}
          </div>
        </div>

        {/* Detail pane */}
        <aside className="w-full lg:w-[min(100%,420px)] xl:w-[460px] shrink-0 bg-gray-50 border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col max-h-[65vh] lg:max-h-none">
          {selected && selectedInView ? (
            <>
              <div className="p-4 border-b border-gray-200 bg-white space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <span className="truncate">{selected.project}</span>
                      <ChevronRight className="h-3 w-3 shrink-0" />
                      <span className="font-mono text-blue-700 font-medium">{selected.key}</span>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 leading-snug">{selected.summary}</h2>
                  </div>
                  <Badge variant="outline" className={cn('shrink-0 text-xs', statusStyle[selected.status])}>
                    {statusLabel[selected.status]}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium',
                      priorityStyle[selected.priority]
                    )}
                  >
                    {priorityLabel[selected.priority]}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600">
                    {(() => {
                      const I = typeIcon[selected.type]
                      return (
                        <>
                          <I className="h-3 w-3" />
                          {typeLabel[selected.type]}
                        </>
                      )
                    })()}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-6 overflow-y-auto flex-1">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                    Description
                  </h3>
                  <div className="rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {selected.description}
                  </div>
                </div>

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
                            <AvatarFallback className="text-xs bg-blue-100 text-blue-800">
                              {selected.assignee.initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-gray-900">{selected.assignee.name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Calendar className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Dates</p>
                        <p className="text-gray-800 mt-0.5">
                          Created {format(selected.createdAt, 'MMM d, yyyy')}
                        </p>
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
                        <p className="text-xs text-gray-500">Labels</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {selected.labels.map((lb) => (
                            <span
                              key={lb}
                              className="rounded-md bg-gray-200/80 px-2 py-0.5 text-xs text-gray-800"
                            >
                              {lb}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="rounded-lg border border-dashed border-gray-300 bg-white/60 p-4 text-center text-sm text-gray-500">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="font-medium text-gray-700">Comments & activity</p>
                  <p className="text-xs mt-1">Connect Supabase to sync threads and history.</p>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="border-gray-200 flex-1" type="button">
                    <Link2 className="h-3.5 w-3.5 mr-1.5" />
                    Copy link
                  </Button>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 flex-1" type="button">
                    Open in board
                  </Button>
                </div>
              </div>
            </>
          ) : selected && !selectedInView ? (
            <div className="p-6 flex flex-col items-center justify-center text-center flex-1 text-gray-500">
              <p className="text-sm">Selected issue is hidden by filters.</p>
              <Button variant="link" className="text-blue-600 mt-2" onClick={() => setProjectId('all')}>
                Clear project filter
              </Button>
            </div>
          ) : (
            <div className="p-8 flex flex-col items-center justify-center text-center flex-1 text-gray-500">
              <CheckSquare className="h-12 w-12 text-gray-300 mb-3" />
              <p className="font-medium text-gray-700">Select an issue</p>
              <p className="text-sm mt-1 max-w-xs">
                Click a row in the list to view description, assignee, dates, and labels.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

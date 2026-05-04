'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TaskRowLite = {
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
}

type TaskDetailResponse = {
  task: {
    id: string
    title: string
    description?: string | null
    priority: 'low' | 'medium' | 'high' | 'critical'
    story_points?: number | null
    workflow_stage_id: string
    completed_at?: string | null
    due_date?: string | null
    assignee_id?: string | null
    blocked?: boolean
    blocked_reason?: string | null
    position?: number | null
    created_at?: string
    updated_at?: string
    current_stage_entered_at?: string | null
    size_band?: 'xs' | 's' | 'm' | 'l' | 'xl' | null
    service_class?: 'standard' | 'fixed_date' | 'expedite' | null
  }
  stage: { id: string; name: string; is_done: boolean; is_backlog: boolean } | null
  assignee: { id: string; full_name: string | null; avatar_url: string | null } | null
  comments: Array<{
    id: string
    content: string
    created_at: string
    user_id: string
    author: { full_name: string | null; avatar_url: string | null }
  }>
}

function formatColumnAge(iso: string | null | undefined): string | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return null
  const hours = Math.floor(ms / 3600000)
  const days = Math.floor(ms / 86400000)
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'}`
  if (hours >= 1) return `${hours} hour${hours === 1 ? '' : 's'}`
  return 'Under 1 hour'
}

function observedLeadTime(detail: TaskDetailResponse['task']): string | null {
  if (!detail.completed_at || !detail.created_at) return null
  const ms = new Date(detail.completed_at).getTime() - new Date(detail.created_at).getTime()
  if (!Number.isFinite(ms) || ms < 0) return null
  return `${(ms / 86400000).toFixed(1)} days`
}

function priorityBadgeClass(p: TaskRowLite['priority']) {
  const x = p === 'critical' ? 'high' : p
  switch (x) {
    case 'high':
      return 'bg-red-50 text-red-700 border-red-100'
    case 'medium':
      return 'bg-yellow-50 text-yellow-700 border-yellow-100'
    case 'low':
      return 'bg-green-50 text-green-700 border-green-100'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-100'
  }
}

export function KanbanTaskDetailModal({
  taskId,
  open,
  onOpenChange,
  onTaskSaved,
}: {
  taskId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskSaved: (row: TaskRowLite) => void
}) {
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [detail, setDetail] = useState<TaskDetailResponse | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskRowLite['priority']>('medium')
  const [sizeBand, setSizeBand] = useState<string>('none')
  const [serviceClass, setServiceClass] = useState<string>('standard')
  const [dueDate, setDueDate] = useState<string>('')
  const [blocked, setBlocked] = useState(false)
  const [blockedReason, setBlockedReason] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)

  const [commentText, setCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)

  const load = useCallback(async () => {
    if (!taskId) return
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(`/api/tasks/${taskId}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to load task')
      const payload = json as TaskDetailResponse
      setDetail(payload)
      const t = payload.task
      setTitle(t.title)
      setDescription(t.description ?? '')
      setPriority(t.priority)
      setSizeBand(t.size_band ? t.size_band : 'none')
      setServiceClass(t.service_class ?? 'standard')
      setDueDate(t.due_date ? String(t.due_date).slice(0, 10) : '')
      setBlocked(!!t.blocked)
      setBlockedReason(t.blocked_reason ?? '')
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load')
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    if (open && taskId) void load()
  }, [open, taskId, load])

  useEffect(() => {
    if (!open) {
      setCommentText('')
      setLoadError(null)
    }
  }, [open])

  const handleSave = async () => {
    if (!taskId || !detail) return

    setSaveLoading(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          title: title.trim(),
          description: description.trim() || null,
          priority,
          story_points: null,
          size_band: sizeBand === 'none' ? null : sizeBand,
          service_class: serviceClass || 'standard',
          due_date: dueDate.trim() || null,
          blocked,
          blocked_reason: blocked ? blockedReason.trim() || null : null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to save')

      const updated = json.data as TaskDetailResponse['task']
      setDetail((d) =>
        d
          ? {
              ...d,
              task: { ...d.task, ...updated },
            }
          : d
      )

      onTaskSaved({
        id: updated.id,
        title: updated.title,
        description: updated.description ?? null,
        priority: updated.priority,
        story_points: updated.story_points ?? null,
        workflow_stage_id: updated.workflow_stage_id,
        completed_at: updated.completed_at ?? null,
        position: updated.position ?? null,
        current_stage_entered_at: updated.current_stage_entered_at ?? null,
        size_band: updated.size_band ?? null,
        service_class: updated.service_class ?? null,
      })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaveLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!taskId || !commentText.trim()) return
    setCommentLoading(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim() }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Failed to post comment')

      const row = json.comment as TaskDetailResponse['comments'][number]
      setDetail((d) => (d ? { ...d, comments: [...d.comments, row] } : d))
      setCommentText('')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Comment failed')
    } finally {
      setCommentLoading(false)
    }
  }

  const task = detail?.task

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="pr-8">Task details</DialogTitle>
          <DialogDescription>
            Kanban work item — optional size and class of service replace story points. Stage moves stay on the board.
            Metrics use dates, not estimates.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading…
          </div>
        ) : loadError ? (
          <p className="text-sm text-red-600 py-4">{loadError}</p>
        ) : task ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              {detail?.stage ? (
                <Badge variant="outline" className="font-normal">
                  {detail.stage.name}
                </Badge>
              ) : null}
              <Badge variant="outline" className={cn('font-normal', priorityBadgeClass(priority))}>
                {priority === 'critical' ? 'high' : priority}
              </Badge>
              {task.completed_at ? (
                <span className="text-xs text-green-600 font-medium">Completed</span>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="task-title">Title</Label>
              <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="task-desc">Description</Label>
              <Textarea
                id="task-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[100px] resize-y"
                placeholder="Acceptance criteria, context, links…"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TaskRowLite['priority'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Size (T‑shirt)</Label>
                <Select value={sizeBand} onValueChange={setSizeBand}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="xs">XS</SelectItem>
                    <SelectItem value="s">S</SelectItem>
                    <SelectItem value="m">M</SelectItem>
                    <SelectItem value="l">L</SelectItem>
                    <SelectItem value="xl">XL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Class of service</Label>
              <Select value={serviceClass} onValueChange={setServiceClass}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="fixed_date">Fixed date</SelectItem>
                  <SelectItem value="expedite">Expedite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="task-due">Due date</Label>
              <Input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>

            <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-4 space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={blocked}
                  onChange={(e) => setBlocked(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Blocked (impediment)
              </label>
              {blocked ? (
                <Textarea
                  value={blockedReason}
                  onChange={(e) => setBlockedReason(e.target.value)}
                  placeholder="What is blocking progress?"
                  className="min-h-[72px] resize-y bg-white"
                />
              ) : null}
            </div>

            <div className="rounded-lg border border-gray-100 bg-slate-50/90 p-4 space-y-2 text-xs text-gray-600">
              <p className="font-semibold text-gray-800 text-sm">Flow signals (observed)</p>
              {!task.completed_at && formatColumnAge(task.current_stage_entered_at) ? (
                <p>
                  <span className="font-medium text-gray-700">Time in current column:</span>{' '}
                  {formatColumnAge(task.current_stage_entered_at)}
                </p>
              ) : null}
              {observedLeadTime(task) ? (
                <p>
                  <span className="font-medium text-gray-700">Lead time (created → done):</span>{' '}
                  {observedLeadTime(task)}
                </p>
              ) : (
                <p className="text-gray-500">
                  Lead time appears when the task is completed — based on created and completed timestamps.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-500">
              <div>
                <span className="font-medium text-gray-600">Assignee</span>
                <p className="mt-0.5 text-gray-800">
                  {detail?.assignee?.full_name?.trim() || 'Unassigned'}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Updated</span>
                <p className="mt-0.5 text-gray-800">
                  {task.updated_at ? new Date(task.updated_at).toLocaleString() : '—'}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">Comments</h4>
              <ul className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {(detail?.comments ?? []).length === 0 ? (
                  <li className="text-xs text-gray-400">No comments yet.</li>
                ) : (
                  (detail?.comments ?? []).map((c) => (
                    <li key={c.id} className="rounded-md border border-gray-100 bg-white p-3 text-sm">
                      <div className="flex justify-between gap-2 text-xs text-gray-400 mb-1">
                        <span className="font-medium text-gray-600">
                          {c.author.full_name?.trim() || 'Member'}
                        </span>
                        <span>{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-gray-800 whitespace-pre-wrap">{c.content}</p>
                    </li>
                  ))
                )}
              </ul>
              <div className="grid gap-2">
                <Label htmlFor="task-comment">Add comment</Label>
                <Textarea
                  id="task-comment"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Discuss progress, blockers, or handoff notes…"
                  className="min-h-[80px] resize-y"
                />
                <Button
                  type="button"
                  size="sm"
                  className="w-fit"
                  disabled={commentLoading || !commentText.trim()}
                  onClick={() => void handleAddComment()}
                >
                  {commentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post comment'}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saveLoading || loading || !detail}>
            {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArchiveRestore, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { processBoardPath } from '@/lib/processes/process-workspace-routes'
import { TaskMessageDialog, taskErrorDialogFromUnknown } from '@/components/tasks/task-message-dialog'
import { TaskTypeIcon } from '@/components/tasks/task-type-icon'
import { TASK_TYPE_META } from '@/lib/tasks/task-type'

export type ArchivedTaskRow = {
  id: string
  title: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  completed_at: string | null
  archived_at: string | null
  workflow_stage_id: string
  task_type?: string | null
}

function formatWhen(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export function KanbanArchivePageClient(props: {
  projectId: string
  phaseId: string
  processId: string
  tasks: ArchivedTaskRow[]
  stageNames: Record<string, string>
}) {
  const router = useRouter()
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null)

  const boardHref = processBoardPath(props.projectId, props.phaseId, props.processId)

  const restoreTask = useCallback(
    async (taskId: string) => {
      setRestoringId(taskId)
      try {
        const res = await fetch('/api/tasks/archive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'restore',
            project_id: props.projectId,
            process_id: props.processId,
            task_ids: [taskId],
          }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json?.error || 'Failed to restore task')
        router.refresh()
      } catch (e) {
        setErrorDialog(taskErrorDialogFromUnknown(e, 'Failed to restore task'))
      } finally {
        setRestoringId(null)
      }
    },
    [props.projectId, props.processId, router]
  )

  return (
    <>
      <TaskMessageDialog
        open={!!errorDialog}
        onOpenChange={(open) => !open && setErrorDialog(null)}
        title={errorDialog?.title ?? ''}
        message={errorDialog?.message ?? ''}
        variant="error"
      />

      <Card className="border-gray-100 shadow-sm">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-lg">Archived work</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Completed items removed from the board. Restore to return them to their done column.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={boardHref}>Back to board</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {props.tasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-6 py-10 text-center">
              <p className="text-sm text-gray-600">No archived tasks for this process yet.</p>
              <p className="text-xs text-gray-500 mt-2">
                Use <span className="font-medium">Archive</span> on a completed column on the board to move finished
                cards here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100 overflow-hidden">
              {props.tasks.map((task) => {
                const stageName = props.stageNames[task.workflow_stage_id] ?? 'Done'
                const taskType = (task.task_type ?? 'task') as keyof typeof TASK_TYPE_META
                const meta = TASK_TYPE_META[taskType] ?? TASK_TYPE_META.task
                return (
                  <li
                    key={task.id}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white px-4 py-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <TaskTypeIcon type={taskType} className="h-4 w-4 shrink-0 text-gray-500" />
                        <span className="font-medium text-gray-900 truncate">{task.title}</span>
                        <Badge variant="secondary" className="text-[10px] font-normal capitalize">
                          {task.priority === 'critical' ? 'high' : task.priority}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-normal text-gray-600">
                          {meta.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        From <span className="font-medium text-gray-700">{stageName}</span>
                        {' · '}
                        Archived {formatWhen(task.archived_at)}
                        {task.completed_at ? (
                          <>
                            {' · '}
                            Completed {formatWhen(task.completed_at)}
                          </>
                        ) : null}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1.5"
                      disabled={restoringId !== null}
                      onClick={() => void restoreTask(task.id)}
                    >
                      {restoringId === task.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ArchiveRestore className="h-3.5 w-3.5" />
                      )}
                      Restore
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  )
}

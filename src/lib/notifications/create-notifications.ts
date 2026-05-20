import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import type { NotificationType } from '@/lib/notifications/types'
import { phaseOverviewHref, taskBoardHref } from '@/lib/notifications/task-board-href'

type InsertRow = {
  organization_id: string
  recipient_id: string
  actor_id: string | null
  type: NotificationType
  title: string
  body?: string | null
  href?: string | null
  project_id?: string | null
  task_id?: string | null
}

async function insertNotifications(rows: InsertRow[]): Promise<void> {
  if (rows.length === 0) return
  const admin = createAdminClient()
  const { error } = await admin.from('user_notifications').insert(rows)
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') {
      console.warn('[notifications] user_notifications table missing — run migration 20260525120000_user_notifications')
      return
    }
    console.error('[notifications] insert failed:', error)
  }
}

async function actorDisplayName(
  supabase: SupabaseClient,
  actorId: string | null | undefined
): Promise<string> {
  if (!actorId) return 'Someone'
  const { data } = await supabase.from('profiles').select('full_name').eq('id', actorId).maybeSingle()
  const name = (data?.full_name as string | null)?.trim()
  return name || 'Someone'
}

export async function notifyTaskAssigned(args: {
  supabase: SupabaseClient
  organizationId: string
  actorId: string
  assigneeId: string | null
  task: {
    id: string
    title: string
    project_id: string
    phase_id?: string | null
    process_id?: string | null
  }
}): Promise<void> {
  const { assigneeId, actorId, task } = args
  if (!assigneeId || assigneeId === actorId) return

  const actor = await actorDisplayName(args.supabase, actorId)
  const title = task.title?.trim() || 'Task'

  await insertNotifications([
    {
      organization_id: args.organizationId,
      recipient_id: assigneeId,
      actor_id: actorId,
      type: 'task_assigned',
      title: 'Task assigned to you',
      body: `${actor} assigned you “${title}”`,
      href: taskBoardHref({
        projectId: task.project_id,
        phaseId: task.phase_id ?? null,
        processId: task.process_id ?? null,
        taskId: task.id,
      }),
      project_id: task.project_id,
      task_id: task.id,
    },
  ])
}

export async function notifyTaskComment(args: {
  supabase: SupabaseClient
  organizationId: string
  actorId: string
  task: {
    id: string
    title: string
    project_id: string
    assignee_id: string | null
    phase_id?: string | null
    process_id?: string | null
  }
  commentPreview: string
}): Promise<void> {
  const assigneeId = args.task.assignee_id
  if (!assigneeId || assigneeId === args.actorId) return

  const actor = await actorDisplayName(args.supabase, args.actorId)
  const title = args.task.title?.trim() || 'Task'
  const preview =
    args.commentPreview.length > 120 ? `${args.commentPreview.slice(0, 117)}…` : args.commentPreview

  await insertNotifications([
    {
      organization_id: args.organizationId,
      recipient_id: assigneeId,
      actor_id: args.actorId,
      type: 'task_comment',
      title: 'New comment on your task',
      body: `${actor} on “${title}”: ${preview}`,
      href: taskBoardHref({
        projectId: args.task.project_id,
        phaseId: args.task.phase_id ?? null,
        processId: args.task.process_id ?? null,
        taskId: args.task.id,
      }),
      project_id: args.task.project_id,
      task_id: args.task.id,
    },
  ])
}

export async function notifyPhaseCompleted(args: {
  supabase: SupabaseClient
  organizationId: string
  actorId: string
  projectId: string
  phaseId: string
  phaseTitle: string
}): Promise<void> {
  const admin = createAdminClient()
  const { data: members, error } = await admin
    .from('project_members')
    .select('user_id')
    .eq('organization_id', args.organizationId)
    .eq('project_id', args.projectId)

  if (error) {
    console.error('[notifications] project_members load:', error)
    return
  }

  const actor = await actorDisplayName(args.supabase, args.actorId)
  const phaseName = args.phaseTitle.trim() || 'Phase'
  const href = phaseOverviewHref(args.projectId, args.phaseId)

  const recipientIds = new Set<string>()
  for (const row of members ?? []) {
    const uid = row.user_id as string
    if (uid && uid !== args.actorId) recipientIds.add(uid)
  }

  if (recipientIds.size === 0) return

  await insertNotifications(
    [...recipientIds].map((recipient_id) => ({
      organization_id: args.organizationId,
      recipient_id,
      actor_id: args.actorId,
      type: 'phase_completed' as const,
      title: 'Phase completed',
      body: `${actor} completed the ${phaseName} phase`,
      href,
      project_id: args.projectId,
      task_id: null,
    }))
  )
}

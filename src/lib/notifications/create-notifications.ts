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

async function getOrgOwnerId(supabase: SupabaseClient, orgId: string): Promise<string | null> {
  const { data } = await supabase.from('organizations').select('owner_id').eq('id', orgId).maybeSingle()
  return data?.owner_id || null
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

  // Also notify the organization owner (if they are not the actor)
  const ownerId = await getOrgOwnerId(args.supabase, args.organizationId)
  if (ownerId && ownerId !== args.actorId) {
    recipientIds.add(ownerId)
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

export async function notifyProjectCompleted(args: {
  supabase: SupabaseClient
  organizationId: string
  actorId: string
  projectId: string
  projectTitle: string
}): Promise<void> {
  const ownerId = await getOrgOwnerId(args.supabase, args.organizationId)
  if (!ownerId || ownerId === args.actorId) return

  const actor = await actorDisplayName(args.supabase, args.actorId)
  const project = args.projectTitle.trim() || 'Project'

  await insertNotifications([
    {
      organization_id: args.organizationId,
      recipient_id: ownerId,
      actor_id: args.actorId,
      type: 'project_completed',
      title: 'Project completed',
      body: `${actor} completed the project “${project}”`,
      href: `/dashboard/projects/${args.projectId}`,
      project_id: args.projectId,
    },
  ])
}

export async function notifyProcessCompleted(args: {
  supabase: SupabaseClient
  organizationId: string
  actorId: string
  projectId: string
  phaseId: string
  phaseTitle: string
  processId: string
  processTitle: string
}): Promise<void> {
  const ownerId = await getOrgOwnerId(args.supabase, args.organizationId)
  if (!ownerId || ownerId === args.actorId) return

  const actor = await actorDisplayName(args.supabase, args.actorId)
  const process = args.processTitle.trim() || 'Process'
  const phase = args.phaseTitle.trim() || 'Phase'

  await insertNotifications([
    {
      organization_id: args.organizationId,
      recipient_id: ownerId,
      actor_id: args.actorId,
      type: 'process_completed',
      title: 'Process completed',
      body: `${actor} completed the process “${process}” in phase “${phase}”`,
      href: phaseOverviewHref(args.projectId, args.phaseId),
      project_id: args.projectId,
    },
  ])
}

export async function notifyTaskCreated(args: {
  supabase: SupabaseClient
  organizationId: string
  actorId: string
  task: {
    id: string
    title: string
    project_id: string
    phase_id?: string | null
    process_id?: string | null
  }
}): Promise<void> {
  const admin = createAdminClient()
  const { task, actorId, organizationId } = args
  const recipientIds = new Set<string>()

  // 1. Organization owner
  const ownerId = await getOrgOwnerId(args.supabase, organizationId)
  if (ownerId && ownerId !== actorId) {
    recipientIds.add(ownerId)
  }

  // 2. Project members (Member side: "assigned project")
  const { data: projMembers } = await admin
    .from('project_members')
    .select('user_id')
    .eq('project_id', task.project_id)
  for (const m of projMembers ?? []) {
    if (m.user_id && m.user_id !== actorId) {
      recipientIds.add(m.user_id)
    }
  }

  // 3. Phase assignee & team members (Member side: "assigned phase")
  if (task.phase_id) {
    const { data: phase } = await admin
      .from('sdlc_phases')
      .select('assigned_user_id, assigned_team_id')
      .eq('id', task.phase_id)
      .maybeSingle()
    if (phase) {
      if (phase.assigned_user_id && phase.assigned_user_id !== actorId) {
        recipientIds.add(phase.assigned_user_id)
      }
      if (phase.assigned_team_id) {
        const { data: teamMembers } = await admin
          .from('team_members')
          .select('user_id')
          .eq('team_id', phase.assigned_team_id)
        for (const tm of teamMembers ?? []) {
          if (tm.user_id && tm.user_id !== actorId) {
            recipientIds.add(tm.user_id)
          }
        }
      }
    }
  }

  // 4. Process assignee & team members (Member side: "assigned process")
  if (task.process_id) {
    const { data: proc } = await admin
      .from('phase_processes')
      .select('assigned_user_id, assigned_team_id')
      .eq('id', task.process_id)
      .maybeSingle()
    if (proc) {
      if (proc.assigned_user_id && proc.assigned_user_id !== actorId) {
        recipientIds.add(proc.assigned_user_id)
      }
      if (proc.assigned_team_id) {
        const { data: teamMembers } = await admin
          .from('team_members')
          .select('user_id')
          .eq('team_id', proc.assigned_team_id)
        for (const tm of teamMembers ?? []) {
          if (tm.user_id && tm.user_id !== actorId) {
            recipientIds.add(tm.user_id)
          }
        }
      }
    }
  }

  if (recipientIds.size === 0) return

  const actor = await actorDisplayName(args.supabase, actorId)
  const title = task.title?.trim() || 'Task'
  const href = taskBoardHref({
    projectId: task.project_id,
    phaseId: task.phase_id ?? null,
    processId: task.process_id ?? null,
    taskId: task.id,
  })

  await insertNotifications(
    [...recipientIds].map((recipient_id) => ({
      organization_id: organizationId,
      recipient_id,
      actor_id: actorId,
      type: 'task_created',
      title: 'New task created',
      body: `${actor} created task “${title}”`,
      href,
      project_id: task.project_id,
      task_id: task.id,
    }))
  )
}

export async function notifyTaskEdited(args: {
  supabase: SupabaseClient
  organizationId: string
  actorId: string
  task: {
    id: string
    title: string
    project_id: string
    phase_id?: string | null
    process_id?: string | null
  }
  changesPreview: string
}): Promise<void> {
  const ownerId = await getOrgOwnerId(args.supabase, args.organizationId)
  if (!ownerId || ownerId === args.actorId) return

  const actor = await actorDisplayName(args.supabase, args.actorId)
  const title = args.task.title?.trim() || 'Task'
  const href = taskBoardHref({
    projectId: args.task.project_id,
    phaseId: args.task.phase_id ?? null,
    processId: args.task.process_id ?? null,
    taskId: args.task.id,
  })

  await insertNotifications([
    {
      organization_id: args.organizationId,
      recipient_id: ownerId,
      actor_id: args.actorId,
      type: 'task_edited',
      title: 'Task updated',
      body: `${actor} updated task “${title}”: ${args.changesPreview}`,
      href,
      project_id: args.task.project_id,
      task_id: args.task.id,
    },
  ])
}

export async function notifyTaskDeleted(args: {
  supabase: SupabaseClient
  organizationId: string
  actorId: string
  taskTitle: string
  projectId: string
}): Promise<void> {
  const ownerId = await getOrgOwnerId(args.supabase, args.organizationId)
  if (!ownerId || ownerId === args.actorId) return

  const actor = await actorDisplayName(args.supabase, args.actorId)
  const title = args.taskTitle.trim() || 'Task'

  await insertNotifications([
    {
      organization_id: args.organizationId,
      recipient_id: ownerId,
      actor_id: args.actorId,
      type: 'task_deleted',
      title: 'Task deleted',
      body: `${actor} deleted task “${title}”`,
      href: `/dashboard/projects/${args.projectId}`,
      project_id: args.projectId,
    },
  ])
}

export async function notifyTeamAdded(args: {
  supabase: SupabaseClient
  organizationId: string
  actorId: string
  teamName: string
  memberIds: string[]
}): Promise<void> {
  const actor = await actorDisplayName(args.supabase, args.actorId)
  const teamName = args.teamName.trim() || 'Team'

  const rows = args.memberIds
    .filter((uid) => uid !== args.actorId)
    .map((recipient_id) => ({
      organization_id: args.organizationId,
      recipient_id,
      actor_id: args.actorId,
      type: 'team_added' as const,
      title: 'Added to team',
      body: `${actor} added you to the team “${teamName}”`,
      href: '/dashboard/settings',
    }))

  await insertNotifications(rows)
}

export async function notifyRoleAdjusted(args: {
  supabase: SupabaseClient
  organizationId: string
  actorId: string
  recipientId: string
  newRole: string
  orgName?: string
}): Promise<void> {
  if (args.recipientId === args.actorId) return

  let orgName = args.orgName
  if (!orgName) {
    const { data } = await args.supabase
      .from('organizations')
      .select('name')
      .eq('id', args.organizationId)
      .maybeSingle()
    orgName = data?.name || 'Organization'
  }

  const actor = await actorDisplayName(args.supabase, args.actorId)

  await insertNotifications([
    {
      organization_id: args.organizationId,
      recipient_id: args.recipientId,
      actor_id: args.actorId,
      type: 'role_adjusted',
      title: 'Role updated',
      body: `${actor} updated your role in organization “${orgName}” to ${args.newRole}`,
      href: '/dashboard',
    },
  ])
}

export async function notifyProjectAssignmentAndRoleAdjustments(args: {
  supabase: SupabaseClient
  organizationId: string
  actorId: string
  projectId: string
  projectName: string
  members: {
    userId: string
    projectAccessLevel: 'Admin' | 'Editor' | 'Viewer'
    functionalRole: string | null
  }[]
  oldMembersMap: Record<
    string,
    { projectAccessLevel: string; functionalRole: string | null }
  >
}): Promise<void> {
  const actor = await actorDisplayName(args.supabase, args.actorId)
  const projName = args.projectName.trim() || 'Project'
  const rows: InsertRow[] = []

  for (const m of args.members) {
    if (m.userId === args.actorId) continue

    const old = args.oldMembersMap[m.userId]
    if (!old) {
      // Newly assigned project member
      rows.push({
        organization_id: args.organizationId,
        recipient_id: m.userId,
        actor_id: args.actorId,
        type: 'assigned_project',
        title: 'Assigned to project',
        body: `${actor} assigned you to project “${projName}”`,
        href: `/dashboard/projects/${args.projectId}`,
        project_id: args.projectId,
      })
    } else if (
      old.projectAccessLevel !== m.projectAccessLevel ||
      old.functionalRole !== m.functionalRole
    ) {
      // Role adjusted
      let roleDesc = m.projectAccessLevel
      if (m.functionalRole) {
        roleDesc += ` (${m.functionalRole})`
      }
      rows.push({
        organization_id: args.organizationId,
        recipient_id: m.userId,
        actor_id: args.actorId,
        type: 'role_adjusted',
        title: 'Project role adjusted',
        body: `${actor} updated your project role to ${roleDesc} in project “${projName}”`,
        href: `/dashboard/projects/${args.projectId}`,
        project_id: args.projectId,
      })
    }
  }

  await insertNotifications(rows)
}

export async function notifyPhaseOrProcessAssigned(args: {
  supabase: SupabaseClient
  organizationId: string
  actorId: string
  projectId: string
  projectName: string
  phaseId: string
  phaseTitle: string
  processId?: string | null
  processTitle?: string | null
  assignedUserId?: string | null
  assignedTeamId?: string | null
}): Promise<void> {
  const {
    supabase,
    organizationId,
    actorId,
    projectId,
    projectName,
    phaseId,
    phaseTitle,
    processId,
    processTitle,
    assignedUserId,
    assignedTeamId,
  } = args

  const actor = await actorDisplayName(supabase, actorId)
  const projName = projectName.trim() || 'Project'
  const phTitle = phaseTitle.trim() || 'Phase'
  const procTitle = processTitle?.trim() || 'Process'

  const recipientIds = new Set<string>()
  const isProcess = !!processId

  // Determine recipients
  if (assignedUserId && assignedUserId !== actorId) {
    recipientIds.add(assignedUserId)
  }

  let teamName = ''
  if (assignedTeamId) {
    const admin = createAdminClient()
    const { data: team } = await admin
      .from('teams')
      .select('name')
      .eq('id', assignedTeamId)
      .maybeSingle()
    teamName = team?.name || 'Team'

    const { data: teamMembers } = await admin
      .from('team_members')
      .select('user_id')
      .eq('team_id', assignedTeamId)
    for (const tm of teamMembers ?? []) {
      if (tm.user_id && tm.user_id !== actorId) {
        recipientIds.add(tm.user_id)
      }
    }
  }

  if (recipientIds.size === 0) return

  const href = isProcess
    ? `/dashboard/projects/${projectId}/phases/${phaseId}/processes/${processId}/board`
    : `/dashboard/projects/${projectId}/phases/${phaseId}`

  const title = isProcess ? 'Assigned to process' : 'Assigned to phase'
  const body = isProcess
    ? assignedTeamId
      ? `${actor} assigned team “${teamName}” to process “${procTitle}” in phase “${phTitle}”`
      : `${actor} assigned you to process “${procTitle}” in phase “${phTitle}”`
    : assignedTeamId
      ? `${actor} assigned team “${teamName}” to phase “${phTitle}” in project “${projName}”`
      : `${actor} assigned you to phase “${phTitle}” in project “${projName}”`

  const type = isProcess ? 'assigned_process' : 'assigned_phase'

  await insertNotifications(
    [...recipientIds].map((recipient_id) => ({
      organization_id: organizationId,
      recipient_id,
      actor_id: actorId,
      type,
      title,
      body,
      href,
      project_id: projectId,
    }))
  )
}

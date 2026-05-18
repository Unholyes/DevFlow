import type { SupabaseClient } from '@supabase/supabase-js'
import type { Project } from '@/types'
import { computeProjectProgressByIds } from '@/lib/projects/compute-project-progress'
import { enrichTasksForNavigator } from '@/lib/tasks/enrich-for-navigator'
import { mapStageToStatus } from '@/lib/tasks/map-stage-to-status'
import type { TaskPriority, TaskStatus } from '@/types'

export type MemberDashboardProject = {
  id: string
  name: string
  description: string
  sdlcMethodology: Project['sdlcMethodology']
  status: Project['status']
  progress: number
  tasksCount: number
  completedTasks: number
  /** ISO date string (YYYY-MM-DD); displayed with toLocaleDateString on client */
  dueDate: string
}

export type MemberDashboardTask = {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  assignee: string
  dueDate: string | null
}

export type MemberDashboardSprintHint = {
  name: string
  endDate: string
  href: string
}

export type MemberDashboardActivity = {
  id: string
  type: 'task_completed' | 'task_created' | 'comment_added' | 'branch_created'
  user: string
  userInitials: string
  action: string
  target: string
  timestamp: string
}

const DEFAULT_METHODOLOGY: Project['sdlcMethodology'] = 'kanban'

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export async function loadMemberDashboardData(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<{
  projects: MemberDashboardProject[]
  myTasks: MemberDashboardTask[]
  activities: MemberDashboardActivity[]
  sprintHint: MemberDashboardSprintHint | null
}> {
  const { data: projectRows, error: projectsError } = await supabase
    .from('projects')
    .select('id,name,description,status,due_date,updated_at')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(6)

  if (projectsError) {
    console.error('Dashboard projects:', projectsError)
  }

  const projects = projectRows ?? []
  const progressByProjectId = await computeProjectProgressByIds(
    supabase,
    organizationId,
    projects.map((p) => ({ id: p.id, status: p.status as string | null }))
  )

  const dashboardProjects: MemberDashboardProject[] = projects.map((p) => {
    const agg = progressByProjectId.get(p.id) ?? {
      progress: 0,
      tasksCount: 0,
      completedTasks: 0,
    }
    const due =
      p.due_date ??
      (typeof p.updated_at === 'string' ? p.updated_at.slice(0, 10) : new Date().toISOString().slice(0, 10))
    return {
      id: p.id,
      name: p.name ?? 'Untitled project',
      description: (p.description as string | null) ?? '',
      sdlcMethodology: DEFAULT_METHODOLOGY,
      status: (p.status as Project['status']) ?? 'active',
      progress: agg.progress,
      tasksCount: agg.tasksCount,
      completedTasks: agg.completedTasks,
      dueDate: typeof due === 'string' ? due : new Date(due).toISOString().slice(0, 10),
    }
  })

  const { data: rawMyTasks, error: myTasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('assignee_id', userId)
    .order('updated_at', { ascending: false })
    .limit(40)

  if (myTasksError) {
    console.error('Dashboard my tasks:', myTasksError)
  }

  const enriched = await enrichTasksForNavigator(supabase, (rawMyTasks ?? []) as Record<string, unknown>[])
  const myTasks: MemberDashboardTask[] = enriched.map((row: Record<string, unknown>) => {
    const stage = row.workflow_stage as
      | { id: string; name: string; is_done: boolean; is_backlog: boolean }
      | null
      | undefined
    const status = mapStageToStatus(
      stage ?? null,
      (row.completed_at as string | null) ?? null,
      Boolean(row.blocked)
    )
    const dueRaw = row.due_date as string | null | undefined
    const dueDate =
      typeof dueRaw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dueRaw)
        ? dueRaw.slice(0, 10)
        : dueRaw
          ? new Date(dueRaw).toISOString().slice(0, 10)
          : null

    return {
      id: row.id as string,
      title: (row.title as string)?.trim() || 'Untitled',
      status,
      priority: (row.priority as TaskPriority) ?? 'medium',
      assignee: 'You',
      dueDate,
    }
  })

  const [activities, sprintHint] = await Promise.all([
    loadRecentActivities(supabase, organizationId),
    loadNearestActiveSprint(supabase, organizationId),
  ])

  return { projects: dashboardProjects, myTasks, activities, sprintHint }
}

async function loadNearestActiveSprint(
  supabase: SupabaseClient,
  organizationId: string
): Promise<MemberDashboardSprintHint | null> {
  const today = new Date().toISOString().slice(0, 10)
  const { data: rows, error } = await supabase
    .from('sprints')
    .select('id,name,end_date,project_id,phase_id,process_id,status')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .gte('end_date', today)
    .order('end_date', { ascending: true })
    .limit(1)

  if (error) {
    console.error('Dashboard sprint hint:', error)
    return null
  }

  const sprint = rows?.[0]
  if (!sprint?.end_date) return null

  const pid = sprint.project_id as string | null
  const phaseId = sprint.phase_id as string | null
  const processId = sprint.process_id as string | null
  let href = '/dashboard/calendar'
  if (pid && phaseId && processId) {
    href = `/dashboard/projects/${pid}/phases/${phaseId}/processes/${processId}/sprints/${sprint.id}`
  }

  const endDate =
    typeof sprint.end_date === 'string'
      ? sprint.end_date.slice(0, 10)
      : new Date(sprint.end_date).toISOString().slice(0, 10)

  return {
    name: (sprint.name as string)?.trim() || 'Active sprint',
    endDate,
    href,
  }
}

async function loadRecentActivities(
  supabase: SupabaseClient,
  organizationId: string
): Promise<MemberDashboardActivity[]> {
  const [tasksRes, commentsRes] = await Promise.all([
    supabase
      .from('tasks')
      .select('id,title,updated_at,created_at,completed_at,assignee_id')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .limit(15),
    supabase
      .from('task_comments')
      .select('id,content,created_at,user_id,task_id')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(15),
  ])

  if (tasksRes.error) console.error('Dashboard activity tasks:', tasksRes.error)
  if (commentsRes.error) console.error('Dashboard activity comments:', commentsRes.error)

  const taskRows = tasksRes.data ?? []
  const commentRows = commentsRes.data ?? []

  const userIds = [...new Set(commentRows.map((c) => c.user_id).filter(Boolean))] as string[]
  const assigneeIds = [...new Set(taskRows.map((t) => t.assignee_id).filter(Boolean))] as string[]
  const allProfileIds = [...new Set([...userIds, ...assigneeIds])]

  let profileById: Record<string, { full_name: string | null }> = {}
  if (allProfileIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id,full_name').in('id', allProfileIds)
    profileById = Object.fromEntries((profiles ?? []).map((pr) => [pr.id, { full_name: pr.full_name }]))
  }

  const taskIdsForComments = [...new Set(commentRows.map((c) => c.task_id).filter(Boolean))] as string[]
  let taskTitleById: Record<string, string> = {}
  if (taskIdsForComments.length > 0) {
    const { data: titles } = await supabase.from('tasks').select('id,title').in('id', taskIdsForComments)
    taskTitleById = Object.fromEntries((titles ?? []).map((t) => [t.id, t.title ?? 'Task']))
  }

  const items: MemberDashboardActivity[] = []

  for (const t of taskRows) {
    const title = t.title ?? 'Task'
    const updated = new Date(t.updated_at).getTime()
    const created = new Date(t.created_at).getTime()
    const isNew = updated - created < 60_000
    const assigneeName = t.assignee_id
      ? profileById[t.assignee_id]?.full_name?.trim() || 'Teammate'
      : 'Someone'
    const initials = initialsFromName(assigneeName)

    if (t.completed_at) {
      items.push({
        id: `task-done-${t.id}`,
        type: 'task_completed',
        user: assigneeName,
        userInitials: initials,
        action: 'completed',
        target: title,
        timestamp: new Date(t.completed_at).toISOString(),
      })
    } else if (isNew) {
      items.push({
        id: `task-new-${t.id}`,
        type: 'task_created',
        user: assigneeName,
        userInitials: initials,
        action: 'created',
        target: title,
        timestamp: new Date(t.created_at).toISOString(),
      })
    } else {
      items.push({
        id: `task-up-${t.id}`,
        type: 'task_created',
        user: assigneeName,
        userInitials: initials,
        action: 'updated',
        target: title,
        timestamp: new Date(t.updated_at).toISOString(),
      })
    }
  }

  for (const c of commentRows) {
    const pr = profileById[c.user_id]
    const display = pr?.full_name?.trim() || 'Teammate'
    items.push({
      id: `comment-${c.id}`,
      type: 'comment_added',
      user: display,
      userInitials: initialsFromName(display),
      action: 'commented on',
      target: taskTitleById[c.task_id] ?? 'a task',
      timestamp: new Date(c.created_at).toISOString(),
    })
  }

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const seen = new Set<string>()
  const deduped: MemberDashboardActivity[] = []
  for (const it of items) {
    const key = `${it.type}-${it.target}-${it.timestamp.slice(0, 16)}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(it)
    if (deduped.length >= 15) break
  }

  return deduped
}

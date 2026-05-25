import type { SupabaseClient } from '@supabase/supabase-js'
import type { Project } from '@/types'
import { computeProjectProgressByIds } from '@/lib/projects/compute-project-progress'
import { enrichTasksForNavigator } from '@/lib/tasks/enrich-for-navigator'
import { mapStageToStatus } from '@/lib/tasks/map-stage-to-status'
import type { TaskPriority, TaskStatus } from '@/types'
import { loadRecentActivity, type RecentActivityItem } from '@/lib/activity/load-recent-activity'

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

export type MemberDashboardActivity = RecentActivityItem

const DEFAULT_METHODOLOGY: Project['sdlcMethodology'] = 'kanban'

function unwrapJoinedProject<T extends Record<string, unknown>>(
  value: T | T[] | null | undefined
): T | null {
  if (Array.isArray(value)) return (value[0] as T | undefined) ?? null
  return value ?? null
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
  const { data: memberships, error: projectsError } = await supabase
    .from('project_members')
    .select(
      `
      project_id,
      projects:project_id (
        id,
        name,
        description,
        status,
        due_date,
        updated_at,
        organization_id
      )
    `,
    )
    .eq('user_id', userId)

  if (projectsError) {
    console.error('Dashboard assigned projects:', projectsError)
  }

  const projects = (memberships ?? [])
    .map((row) => {
      const project = unwrapJoinedProject(
        (row as { projects?: Record<string, unknown> | Record<string, unknown>[] | null }).projects
      )
      if (!project?.id) return null
      if (String(project.organization_id ?? '') !== organizationId) return null
      if (String(project.status ?? '') !== 'active') return null
      return project
    })
    .filter((p): p is Record<string, unknown> => p !== null)
    .sort((a, b) => {
      const aTime = typeof a.updated_at === 'string' ? Date.parse(a.updated_at) : 0
      const bTime = typeof b.updated_at === 'string' ? Date.parse(b.updated_at) : 0
      return bTime - aTime
    })
    .slice(0, 6)
  const progressByProjectId = await computeProjectProgressByIds(
    supabase,
    organizationId,
    projects.map((p) => ({ id: String(p.id), status: (p.status as string | null) ?? null }))
  )

  const dashboardProjects: MemberDashboardProject[] = projects.map((p) => {
    const projectId = String(p.id)
    const agg = progressByProjectId.get(projectId) ?? {
      progress: 0,
      tasksCount: 0,
      completedTasks: 0,
    }
    const dueRaw = p.due_date ?? p.updated_at
    const dueDate =
      typeof dueRaw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dueRaw)
        ? dueRaw.slice(0, 10)
        : dueRaw
          ? new Date(String(dueRaw)).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10)
    return {
      id: projectId,
      name: (p.name as string | null) ?? 'Untitled project',
      description: (p.description as string | null) ?? '',
      sdlcMethodology: DEFAULT_METHODOLOGY,
      status: (p.status as Project['status']) ?? 'active',
      progress: agg.progress,
      tasksCount: agg.tasksCount,
      completedTasks: agg.completedTasks,
      dueDate,
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

  const assignedProjectIds = projects.map((p) => String(p.id))

  const [activities, sprintHint] = await Promise.all([
    loadRecentActivity(supabase, { organizationId, limit: 15 }),
    loadNearestActiveSprint(supabase, organizationId, assignedProjectIds),
  ])

  return { projects: dashboardProjects, myTasks, activities, sprintHint }
}

async function loadNearestActiveSprint(
  supabase: SupabaseClient,
  organizationId: string,
  assignedProjectIds: string[]
): Promise<MemberDashboardSprintHint | null> {
  if (assignedProjectIds.length === 0) return null

  const today = new Date().toISOString().slice(0, 10)
  const { data: rows, error } = await supabase
    .from('sprints')
    .select('id,name,end_date,project_id,phase_id,process_id,status')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .in('project_id', assignedProjectIds)
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

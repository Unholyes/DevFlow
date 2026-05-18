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
    loadRecentActivity(supabase, { organizationId, limit: 15 }),
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

import type { SupabaseClient } from '@supabase/supabase-js'

export type RecentActivityType = 'task_completed' | 'task_created' | 'comment_added' | 'branch_created'

export type RecentActivityItem = {
  id: string
  type: RecentActivityType
  user: string
  userInitials: string
  action: string
  target: string
  timestamp: string
}

export type RecentActivityFilter = {
  organizationId: string
  projectId?: string | null
  phaseId?: string | null
  processId?: string | null
  limit?: number
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

async function processIdsForPhase(
  supabase: SupabaseClient,
  organizationId: string,
  phaseId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('phase_processes')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('phase_id', phaseId)

  if (error) {
    console.error('loadRecentActivity processIdsForPhase:', error)
    return []
  }
  return (data ?? []).map((r) => r.id as string)
}

function dedupeActivities(items: RecentActivityItem[], limit: number): RecentActivityItem[] {
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  const seen = new Set<string>()
  const deduped: RecentActivityItem[] = []
  for (const it of items) {
    const key = `${it.type}-${it.target}-${it.timestamp.slice(0, 16)}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(it)
    if (deduped.length >= limit) break
  }
  return deduped
}

export async function loadRecentActivity(
  supabase: SupabaseClient,
  filter: RecentActivityFilter
): Promise<RecentActivityItem[]> {
  const limit = filter.limit ?? 15
  const fetchLimit = Math.min(Math.max(limit * 3, 20), 60)

  let processIdsForPhaseFilter: string[] | null = null
  if (filter.processId) {
    // single process — no extra lookup
  } else if (filter.phaseId) {
    processIdsForPhaseFilter = await processIdsForPhase(supabase, filter.organizationId, filter.phaseId)
    if (processIdsForPhaseFilter.length === 0) return []
  }

  let taskQuery = supabase
    .from('tasks')
    .select('id,title,updated_at,created_at,completed_at,assignee_id,process_id,project_id')
    .eq('organization_id', filter.organizationId)
    .order('updated_at', { ascending: false })
    .limit(fetchLimit)

  if (filter.projectId) taskQuery = taskQuery.eq('project_id', filter.projectId)
  if (filter.processId) {
    taskQuery = taskQuery.eq('process_id', filter.processId)
  } else if (processIdsForPhaseFilter) {
    taskQuery = taskQuery.in('process_id', processIdsForPhaseFilter)
  }

  const tasksRes = await taskQuery

  if (tasksRes.error) {
    console.error('loadRecentActivity tasks:', tasksRes.error)
    return []
  }

  const taskRows = tasksRes.data ?? []
  const taskIds = taskRows.map((t) => t.id as string)

  let commentRows: { id: string; created_at: string; user_id: string; task_id: string }[] = []
  if (taskIds.length > 0) {
    const commentsRes = await supabase
      .from('task_comments')
      .select('id,created_at,user_id,task_id')
      .eq('organization_id', filter.organizationId)
      .in('task_id', taskIds)
      .order('created_at', { ascending: false })
      .limit(fetchLimit)

    if (commentsRes.error) {
      console.error('loadRecentActivity comments:', commentsRes.error)
    } else {
      commentRows = (commentsRes.data ?? []) as typeof commentRows
    }
  }

  const userIds = [...new Set(commentRows.map((c) => c.user_id).filter(Boolean))] as string[]
  const assigneeIds = [...new Set(taskRows.map((t) => t.assignee_id).filter(Boolean))] as string[]
  const allProfileIds = [...new Set([...userIds, ...assigneeIds])]

  const profileById: Record<string, { full_name: string | null }> = {}
  if (allProfileIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id,full_name').in('id', allProfileIds)
    for (const pr of profiles ?? []) {
      profileById[pr.id] = { full_name: pr.full_name }
    }
  }

  const taskTitleById = Object.fromEntries(taskRows.map((t) => [t.id, (t.title as string) ?? 'Task']))

  const items: RecentActivityItem[] = []

  for (const t of taskRows) {
    const title = (t.title as string) ?? 'Task'
    const updated = new Date(t.updated_at as string).getTime()
    const created = new Date(t.created_at as string).getTime()
    const isNew = updated - created < 60_000
    const assigneeName = t.assignee_id
      ? profileById[t.assignee_id as string]?.full_name?.trim() || 'Teammate'
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
        timestamp: new Date(t.completed_at as string).toISOString(),
      })
    } else if (isNew) {
      items.push({
        id: `task-new-${t.id}`,
        type: 'task_created',
        user: assigneeName,
        userInitials: initials,
        action: 'created',
        target: title,
        timestamp: new Date(t.created_at as string).toISOString(),
      })
    } else {
      items.push({
        id: `task-up-${t.id}`,
        type: 'task_created',
        user: assigneeName,
        userInitials: initials,
        action: 'updated',
        target: title,
        timestamp: new Date(t.updated_at as string).toISOString(),
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

  return dedupeActivities(items, limit)
}

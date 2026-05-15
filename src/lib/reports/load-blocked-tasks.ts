import { formatDistanceToNow } from 'date-fns'
import type { SupabaseClient } from '@supabase/supabase-js'

export type BlockedTaskReportRow = {
  id: string
  title: string
  reason: string
  assignee: string
  initials: string
  blockedAgo: string
  projectName: string
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export async function loadBlockedTasksForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  limit = 25
): Promise<BlockedTaskReportRow[]> {
  const { data: rows, error } = await supabase
    .from('tasks')
    .select('id, title, blocked_reason, updated_at, assignee_id, project_id')
    .eq('organization_id', organizationId)
    .eq('blocked', true)
    .is('completed_at', null)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('loadBlockedTasksForOrg:', error)
    return []
  }

  const tasks = rows ?? []
  if (tasks.length === 0) return []

  const assigneeIds = [...new Set(tasks.map((t) => t.assignee_id).filter((id): id is string => !!id))]
  const projectIds = [...new Set(tasks.map((t) => t.project_id).filter((id): id is string => !!id))]

  const [profilesRes, projectsRes] = await Promise.all([
    assigneeIds.length > 0
      ? supabase.from('profiles').select('id, full_name').in('id', assigneeIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    projectIds.length > 0
      ? supabase.from('projects').select('id, name').in('id', projectIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])

  const nameByUserId = Object.fromEntries(
    (profilesRes.data ?? []).map((p) => [p.id, p.full_name?.trim() || 'Unassigned'])
  )
  const projectById = Object.fromEntries((projectsRes.data ?? []).map((p) => [p.id, p.name]))

  return tasks.map((t) => {
    const assignee = t.assignee_id ? nameByUserId[t.assignee_id] ?? 'Unassigned' : 'Unassigned'
    const updated = t.updated_at ? new Date(t.updated_at) : new Date()
    return {
      id: t.id,
      title: t.title?.trim() || 'Untitled',
      reason: t.blocked_reason?.trim() || 'No reason provided',
      assignee,
      initials: initialsFromName(assignee === 'Unassigned' ? '?' : assignee),
      blockedAgo: `Blocked ${formatDistanceToNow(updated, { addSuffix: true })}`,
      projectName: projectById[t.project_id] ?? 'Project',
    }
  })
}

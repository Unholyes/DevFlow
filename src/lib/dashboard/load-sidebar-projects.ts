import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserRole } from '@/types'

export type SidebarProject = { id: string; name: string }

function unwrapJoinedProject<T extends { id: string; name: string; created_at?: string }>(
  value: T | T[] | null | undefined
): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export async function loadSidebarProjects(
  supabase: SupabaseClient,
  opts: { organizationId: string; userId: string; role: UserRole; limit?: number }
): Promise<SidebarProject[]> {
  const limit = opts.limit ?? 4

  if (opts.role === 'tenant_admin') {
    const { data } = await supabase
      .from('projects')
      .select('id,name')
      .eq('organization_id', opts.organizationId)
      .order('created_at', { ascending: false })
      .limit(limit)
    return data ?? []
  }

  const { data: memberships } = await supabase
    .from('project_members')
    .select('project_id, projects:project_id ( id, name, created_at, organization_id )')
    .eq('user_id', opts.userId)

  const projects: SidebarProject[] = []

  for (const row of memberships ?? []) {
    const project = unwrapJoinedProject(
      (row as {
        projects?:
          | { id: string; name: string; created_at?: string; organization_id?: string }
          | { id: string; name: string; created_at?: string; organization_id?: string }[]
          | null
      }).projects
    )
    if (
      project?.id &&
      project?.name &&
      String(project.organization_id ?? '') === opts.organizationId
    ) {
      projects.push({ id: project.id, name: project.name })
    }
  }

  return projects.slice(0, limit)
}

export async function loadMemberProjectIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data: memberships } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId)

  return (memberships ?? []).map((row) => row.project_id).filter(Boolean)
}

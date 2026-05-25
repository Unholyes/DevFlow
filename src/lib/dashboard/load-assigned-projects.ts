import type { SupabaseClient } from '@supabase/supabase-js'

export type AssignedProject = {
  id: string
  name: string
  description: string | null
  status: string
  created_at: string
}

function unwrapJoinedProject<
  T extends {
    id: string
    name: string
    description?: string | null
    status?: string
    created_at?: string
    organization_id?: string
  },
>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export async function loadAssignedProjectsForUser(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<AssignedProject[]> {
  const { data: memberships } = await supabase
    .from('project_members')
    .select(
      'project_id, projects:project_id ( id, name, description, status, created_at, organization_id )'
    )
    .eq('user_id', userId)

  const projects: AssignedProject[] = []

  for (const row of memberships ?? []) {
    const project = unwrapJoinedProject(
      (row as {
        projects?:
          | {
              id: string
              name: string
              description?: string | null
              status?: string
              created_at?: string
              organization_id?: string
            }
          | {
              id: string
              name: string
              description?: string | null
              status?: string
              created_at?: string
              organization_id?: string
            }[]
          | null
      }).projects
    )

    if (
      project?.id &&
      project?.name &&
      String(project.organization_id ?? '') === organizationId
    ) {
      projects.push({
        id: project.id,
        name: project.name,
        description: project.description ?? null,
        status: project.status ?? 'active',
        created_at: project.created_at ?? new Date().toISOString(),
      })
    }
  }

  return projects.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
}

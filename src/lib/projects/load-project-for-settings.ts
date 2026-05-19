import type { SupabaseClient } from '@supabase/supabase-js'

export type ProjectSettingsRecord = {
  id: string
  name: string
  description: string
  status: 'active' | 'completed' | 'archived'
  phaseGatingEnabled: boolean
  dueDate: string | null
  organizationId: string
}

type ProjectRow = {
  id: string
  name: string
  description: string | null
  status: 'active' | 'completed' | 'archived'
  phase_gating_enabled?: boolean | null
  due_date?: string | null
  organization_id: string
}

export async function loadProjectForSettings(
  supabase: SupabaseClient,
  organizationId: string,
  projectId: string,
): Promise<ProjectSettingsRecord | null> {
  let project: ProjectRow | null = null

  const attempt = await supabase
    .from('projects')
    .select('id,name,description,status,phase_gating_enabled,due_date,organization_id')
    .eq('organization_id', organizationId)
    .eq('id', projectId)
    .maybeSingle()

  if (attempt.error?.code === 'PGRST204') {
    const fallbackWithDueDate = await supabase
      .from('projects')
      .select('id,name,description,status,due_date,organization_id')
      .eq('organization_id', organizationId)
      .eq('id', projectId)
      .maybeSingle()

    if (fallbackWithDueDate.error?.code === 'PGRST204') {
      const fallback = await supabase
        .from('projects')
        .select('id,name,description,status,organization_id')
        .eq('organization_id', organizationId)
        .eq('id', projectId)
        .maybeSingle()
      project = fallback.data as ProjectRow | null
    } else {
      project = fallbackWithDueDate.data as ProjectRow | null
    }
  } else {
    project = attempt.data as ProjectRow | null
  }

  if (!project?.id) return null

  return {
    id: project.id,
    name: project.name,
    description: project.description ?? '',
    status: project.status,
    phaseGatingEnabled: !!project.phase_gating_enabled,
    dueDate: project.due_date ?? null,
    organizationId: String(project.organization_id),
  }
}

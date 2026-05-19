import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildFunctionalRolePermissionsMap,
  defaultFunctionalRolePermissions,
  filterToProjectTemplatePermissions,
  isFunctionalRoleId,
  type FunctionalRoleId,
} from '@/lib/permissions/project-template-permissions'

export async function loadProjectFunctionalRolePermissionsMap(
  supabase: SupabaseClient,
  projectId: string,
): Promise<Record<FunctionalRoleId, string[]>> {
  const { data: rows, error } = await supabase
    .from('project_functional_role_templates')
    .select('functional_role,permissions')
    .eq('project_id', projectId)

  if (error) {
    const code = String((error as { code?: string }).code ?? '')
    const message = String((error as { message?: string }).message ?? '')
    if (code === 'PGRST205' || message.includes('project_functional_role_templates')) {
      return buildFunctionalRolePermissionsMap([])
    }
    throw error
  }

  return buildFunctionalRolePermissionsMap(rows ?? [])
}

export async function loadProjectFunctionalRolePermissions(
  supabase: SupabaseClient,
  projectId: string,
  functionalRole: FunctionalRoleId,
): Promise<string[]> {
  const { data: row, error } = await supabase
    .from('project_functional_role_templates')
    .select('permissions')
    .eq('project_id', projectId)
    .eq('functional_role', functionalRole)
    .maybeSingle()

  if (error) {
    const code = String((error as { code?: string }).code ?? '')
    const message = String((error as { message?: string }).message ?? '')
    if (code === 'PGRST205' || message.includes('project_functional_role_templates')) {
      return defaultFunctionalRolePermissions(functionalRole)
    }
    throw error
  }

  if (row?.permissions != null) {
    return filterToProjectTemplatePermissions(row.permissions)
  }

  return defaultFunctionalRolePermissions(functionalRole)
}

export function parseFunctionalRole(value: unknown): FunctionalRoleId | null {
  const s = String(value ?? '').trim()
  return isFunctionalRoleId(s) ? (s as FunctionalRoleId) : null
}

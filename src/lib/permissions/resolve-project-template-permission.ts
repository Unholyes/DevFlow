import type { SupabaseClient } from '@supabase/supabase-js'
import { canonicalBuiltinRoleKey } from '@/lib/permissions/can-manage-organization-roles'
import {
  defaultProjectTemplatePermissions,
  filterToProjectTemplatePermissions,
  type ProjectAccessLevel,
} from '@/lib/permissions/project-template-permissions'

const ACCESS_LEVEL_RANK: Record<ProjectAccessLevel, number> = {
  Admin: 3,
  Editor: 2,
  Viewer: 1,
}

function normalizeName(input: string) {
  return input.trim().replace(/\s+/g, ' ')
}

function permissionListHas(perms: unknown, id: string) {
  if (!Array.isArray(perms)) return false
  const target = id.toLowerCase()
  return perms.some((p) => typeof p === 'string' && p.toLowerCase() === target)
}

function parseProjectAccessLevel(value: unknown): ProjectAccessLevel | null {
  const s = String(value ?? '').trim()
  if (s === 'Admin' || s === 'Editor' || s === 'Viewer') return s
  return null
}

function highestAccessLevel(levels: ProjectAccessLevel[]): ProjectAccessLevel {
  return levels.reduce(
    (best, cur) => (ACCESS_LEVEL_RANK[cur] > ACCESS_LEVEL_RANK[best] ? cur : best),
    'Viewer',
  )
}

async function loadTemplatePermissions(
  supabase: SupabaseClient,
  organizationId: string,
  accessLevel: ProjectAccessLevel,
): Promise<string[]> {
  const { data: row, error } = await supabase
    .from('organization_project_access_templates')
    .select('permissions')
    .eq('organization_id', organizationId)
    .eq('access_level', accessLevel)
    .maybeSingle()

  if (!error && row?.permissions != null) {
    return filterToProjectTemplatePermissions(row.permissions)
  }

  return defaultProjectTemplatePermissions(accessLevel)
}

async function userCanCreateProjects(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
): Promise<boolean> {
  const { data: membership } = await supabase
    .from('organization_members')
    .select('system_role,custom_roles')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle()

  const systemRole = String((membership as { system_role?: unknown })?.system_role ?? 'Member')
  if (systemRole === 'Owner') return true

  const assignedCustomRoles: string[] = Array.isArray((membership as { custom_roles?: unknown })?.custom_roles)
    ? ((membership as { custom_roles: unknown[] }).custom_roles.filter(
        (x): x is string => typeof x === 'string' && x.trim().length > 0,
      ) as string[])
    : []

  const roleKey = canonicalBuiltinRoleKey(systemRole)
  const [{ data: defaultRoleRow }, { data: customRoleRows }] = await Promise.all([
    roleKey
      ? supabase
          .from('organization_default_roles')
          .select('permissions')
          .eq('organization_id', organizationId)
          .eq('role', roleKey)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('organization_roles').select('name,permissions').eq('organization_id', organizationId),
  ])

  const customByNameLower = new Map<string, unknown>()
  for (const r of customRoleRows ?? []) {
    const nameLower = normalizeName(String((r as { name?: unknown })?.name ?? '')).toLowerCase()
    if (!nameLower) continue
    customByNameLower.set(nameLower, (r as { permissions?: unknown }).permissions)
  }

  if (permissionListHas((defaultRoleRow as { permissions?: unknown })?.permissions, 'pm.projects.create')) {
    return true
  }

  return assignedCustomRoles.some((name) =>
    permissionListHas(customByNameLower.get(normalizeName(name).toLowerCase()), 'pm.projects.create'),
  )
}

export async function resolveProjectAccessLevelForUser(
  supabase: SupabaseClient,
  params: { organizationId: string; userId: string; projectId?: string | null },
): Promise<ProjectAccessLevel> {
  const { organizationId, userId, projectId } = params

  if (projectId) {
    const { data: member } = await supabase
      .from('project_members')
      .select('project_access_level')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .maybeSingle()

    const level = parseProjectAccessLevel((member as { project_access_level?: unknown })?.project_access_level)
    if (level) return level
  }

  const { data: orgMember } = await supabase
    .from('organization_members')
    .select('system_role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle()

  const systemRole = String((orgMember as { system_role?: unknown })?.system_role ?? 'Member')
  if (systemRole === 'Owner') return 'Admin'

  if (await userCanCreateProjects(supabase, organizationId, userId)) {
    return 'Admin'
  }

  const { data: orgProjects } = await supabase.from('projects').select('id').eq('organization_id', organizationId)
  const projectIds = (orgProjects ?? []).map((p) => String((p as { id?: unknown }).id ?? '')).filter(Boolean)

  if (projectIds.length > 0) {
    const { data: projectMemberships } = await supabase
      .from('project_members')
      .select('project_access_level')
      .eq('user_id', userId)
      .in('project_id', projectIds)

    const levels = (projectMemberships ?? [])
      .map((row) => parseProjectAccessLevel((row as { project_access_level?: unknown }).project_access_level))
      .filter((l): l is ProjectAccessLevel => l != null)

    if (levels.length > 0) return highestAccessLevel(levels)
  }

  return 'Viewer'
}

export async function userHasProjectTemplatePermission(
  supabase: SupabaseClient,
  params: {
    organizationId: string
    userId: string
    permissionId: string
    projectId?: string | null
  },
): Promise<boolean> {
  const accessLevel = await resolveProjectAccessLevelForUser(supabase, params)
  const permissions = await loadTemplatePermissions(supabase, params.organizationId, accessLevel)
  const target = params.permissionId.toLowerCase()
  return permissions.some((p) => p.toLowerCase() === target)
}

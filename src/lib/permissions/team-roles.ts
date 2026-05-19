import type { SupabaseClient } from '@supabase/supabase-js'
import { filterToProjectTemplatePermissions } from '@/lib/permissions/project-template-permissions'

export type OrganizationTeamRoleRow = {
  id: string
  organization_id: string
  slug: string
  name: string
  description: string | null
  permissions: string[]
  created_at?: string
  updated_at?: string
}

export type ProjectTeamRoleRow = {
  id: string
  project_id: string
  organization_team_role_id: string | null
  name: string
  description: string | null
  permissions: string[]
  inherits_from_org: boolean
  created_at?: string
  updated_at?: string
}

export type ProjectTeamRoleWithOrg = ProjectTeamRoleRow & {
  orgPermissions?: string[]
  effectivePermissions: string[]
}

function normalizeSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .slice(0, 64)
}

export function slugifyTeamRoleName(name: string) {
  const base = normalizeSlug(name)
  return base.length > 0 && /^[a-z]/.test(base) ? base : `role_${base || 'custom'}`
}

function isMissingTable(error: unknown, table: string) {
  const code = typeof error === 'object' && error !== null ? String((error as { code?: string }).code ?? '') : ''
  const message =
    typeof error === 'object' && error !== null ? String((error as { message?: string }).message ?? '') : String(error ?? '')
  return code === 'PGRST205' || message.includes(table)
}

export function resolveEffectiveTeamRolePermissions(
  projectRole: Pick<ProjectTeamRoleRow, 'permissions' | 'inherits_from_org'>,
  orgPermissions: string[] | null | undefined,
): string[] {
  if (projectRole.inherits_from_org && orgPermissions) {
    return filterToProjectTemplatePermissions(orgPermissions)
  }
  return filterToProjectTemplatePermissions(projectRole.permissions)
}

export async function loadOrganizationTeamRoles(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<OrganizationTeamRoleRow[]> {
  const { data, error } = await supabase
    .from('organization_team_roles')
    .select('id,organization_id,slug,name,description,permissions,created_at,updated_at')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true })

  if (error) {
    if (isMissingTable(error, 'organization_team_roles')) return []
    throw error
  }

  return (data ?? []).map((row) => ({
    id: String((row as { id: string }).id),
    organization_id: String((row as { organization_id: string }).organization_id),
    slug: String((row as { slug: string }).slug),
    name: String((row as { name: string }).name),
    description: ((row as { description?: string | null }).description ?? null) as string | null,
    permissions: filterToProjectTemplatePermissions((row as { permissions?: unknown }).permissions),
    created_at: (row as { created_at?: string }).created_at,
    updated_at: (row as { updated_at?: string }).updated_at,
  }))
}

async function loadExcludedOrganizationTeamRoleIds(
  supabase: SupabaseClient,
  projectId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('project_excluded_organization_team_roles')
    .select('organization_team_role_id')
    .eq('project_id', projectId)

  if (error) {
    if (isMissingTable(error, 'project_excluded_organization_team_roles')) return new Set()
    throw error
  }

  return new Set(
    (data ?? [])
      .map((r) => String((r as { organization_team_role_id?: unknown }).organization_team_role_id ?? ''))
      .filter(Boolean),
  )
}

export async function ensureProjectTeamRolesSynced(
  supabase: SupabaseClient,
  projectId: string,
  organizationId: string,
): Promise<void> {
  const orgRoles = await loadOrganizationTeamRoles(supabase, organizationId)
  if (orgRoles.length === 0) return

  const excluded = await loadExcludedOrganizationTeamRoleIds(supabase, projectId)

  const { data: existing, error: existingError } = await supabase
    .from('project_team_roles')
    .select('organization_team_role_id')
    .eq('project_id', projectId)

  if (existingError && !isMissingTable(existingError, 'project_team_roles')) {
    throw existingError
  }

  const linked = new Set(
    (existing ?? [])
      .map((r) => (r as { organization_team_role_id?: string | null }).organization_team_role_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0),
  )

  const missing = orgRoles.filter((r) => !linked.has(r.id) && !excluded.has(r.id))
  if (missing.length === 0) return

  const { error: insertError } = await supabase.from('project_team_roles').insert(
    missing.map((orgRole) => ({
      project_id: projectId,
      organization_team_role_id: orgRole.id,
      name: orgRole.name,
      description: orgRole.description,
      permissions: orgRole.permissions,
      inherits_from_org: true,
    })),
  )

  if (insertError && !isMissingTable(insertError, 'project_team_roles')) {
    throw insertError
  }
}

export async function loadProjectTeamRoles(
  supabase: SupabaseClient,
  projectId: string,
  organizationId: string,
): Promise<ProjectTeamRoleWithOrg[]> {
  await ensureProjectTeamRolesSynced(supabase, projectId, organizationId)

  const [orgRoles, { data: projectRows, error }] = await Promise.all([
    loadOrganizationTeamRoles(supabase, organizationId),
    supabase
      .from('project_team_roles')
      .select(
        'id,project_id,organization_team_role_id,name,description,permissions,inherits_from_org,created_at,updated_at',
      )
      .eq('project_id', projectId)
      .order('name', { ascending: true }),
  ])

  if (error) {
    if (isMissingTable(error, 'project_team_roles')) return []
    throw error
  }

  const orgById = new Map(orgRoles.map((r) => [r.id, r]))

  return (projectRows ?? []).map((row) => {
    const organizationTeamRoleId = (row as { organization_team_role_id?: string | null }).organization_team_role_id
    const orgRole = organizationTeamRoleId ? orgById.get(organizationTeamRoleId) : undefined
    const projectRole: ProjectTeamRoleRow = {
      id: String((row as { id: string }).id),
      project_id: String((row as { project_id: string }).project_id),
      organization_team_role_id: organizationTeamRoleId ?? null,
      name: String((row as { name: string }).name),
      description: ((row as { description?: string | null }).description ?? null) as string | null,
      permissions: filterToProjectTemplatePermissions((row as { permissions?: unknown }).permissions),
      inherits_from_org: !!(row as { inherits_from_org?: boolean }).inherits_from_org,
      created_at: (row as { created_at?: string }).created_at,
      updated_at: (row as { updated_at?: string }).updated_at,
    }
    const orgPermissions = orgRole?.permissions
    return {
      ...projectRole,
      orgPermissions,
      effectivePermissions: resolveEffectiveTeamRolePermissions(projectRole, orgPermissions),
    }
  })
}

export async function resolvePermissionsForProjectTeamRoleId(
  supabase: SupabaseClient,
  projectTeamRoleId: string,
  organizationId: string,
): Promise<string[]> {
  const { data: row, error } = await supabase
    .from('project_team_roles')
    .select('id,project_id,organization_team_role_id,name,description,permissions,inherits_from_org')
    .eq('id', projectTeamRoleId)
    .maybeSingle()

  if (error || !row) {
    if (error && !isMissingTable(error, 'project_team_roles')) throw error
    return []
  }

  const projectRole: ProjectTeamRoleRow = {
    id: String((row as { id: string }).id),
    project_id: String((row as { project_id: string }).project_id),
    organization_team_role_id: ((row as { organization_team_role_id?: string | null }).organization_team_role_id ??
      null) as string | null,
    name: String((row as { name: string }).name),
    description: ((row as { description?: string | null }).description ?? null) as string | null,
    permissions: filterToProjectTemplatePermissions((row as { permissions?: unknown }).permissions),
    inherits_from_org: !!(row as { inherits_from_org?: boolean }).inherits_from_org,
  }

  if (!projectRole.inherits_from_org || !projectRole.organization_team_role_id) {
    return filterToProjectTemplatePermissions(projectRole.permissions)
  }

  const { data: orgRole } = await supabase
    .from('organization_team_roles')
    .select('permissions')
    .eq('id', projectRole.organization_team_role_id)
    .eq('organization_id', organizationId)
    .maybeSingle()

  return resolveEffectiveTeamRolePermissions(
    projectRole,
    filterToProjectTemplatePermissions((orgRole as { permissions?: unknown } | null)?.permissions),
  )
}

export async function syncOrgTeamRoleToAllProjects(
  admin: SupabaseClient,
  organizationId: string,
  organizationTeamRoleId: string,
  orgRole: Pick<OrganizationTeamRoleRow, 'name' | 'description' | 'permissions'>,
) {
  const { data: projects } = await admin.from('projects').select('id').eq('organization_id', organizationId)
  const projectIds = (projects ?? []).map((p) => String((p as { id: string }).id)).filter(Boolean)
  if (projectIds.length === 0) return

  for (const projectId of projectIds) {
    const { data: existing } = await admin
      .from('project_team_roles')
      .select('id,inherits_from_org')
      .eq('project_id', projectId)
      .eq('organization_team_role_id', organizationTeamRoleId)
      .maybeSingle()

    if (!existing?.id) {
      await admin.from('project_team_roles').insert({
        project_id: projectId,
        organization_team_role_id: organizationTeamRoleId,
        name: orgRole.name,
        description: orgRole.description,
        permissions: orgRole.permissions,
        inherits_from_org: true,
      })
      continue
    }

    if ((existing as { inherits_from_org?: boolean }).inherits_from_org) {
      await admin
        .from('project_team_roles')
        .update({
          name: orgRole.name,
          description: orgRole.description,
          permissions: orgRole.permissions,
        })
        .eq('id', (existing as { id: string }).id)
    } else {
      await admin
        .from('project_team_roles')
        .update({ name: orgRole.name, description: orgRole.description })
        .eq('id', (existing as { id: string }).id)
    }
  }
}

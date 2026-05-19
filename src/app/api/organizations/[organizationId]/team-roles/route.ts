import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { userCanManageOrganizationRoles } from '@/lib/permissions/can-manage-organization-roles'
import { filterToProjectTemplatePermissions } from '@/lib/permissions/project-template-permissions'
import {
  loadOrganizationTeamRoles,
  slugifyTeamRoleName,
  syncOrgTeamRoleToAllProjects,
} from '@/lib/permissions/team-roles'

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

export async function GET(_request: Request, context: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await context.params
  if (!organizationId) return jsonError(400, 'Missing organization id')

  const supabase = createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) return jsonError(401, 'Unauthorized')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership?.id) return jsonError(403, 'Forbidden')

  const roles = await loadOrganizationTeamRoles(supabase, organizationId)
  return NextResponse.json({ roles })
}

export async function POST(request: Request, context: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await context.params
  if (!organizationId) return jsonError(400, 'Missing organization id')

  let parsed: unknown
  try {
    parsed = await request.json()
  } catch {
    return jsonError(400, 'Invalid JSON')
  }
  if (!parsed || typeof parsed !== 'object') return jsonError(400, 'Invalid body')
  const body = parsed as Record<string, unknown>

  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
  if (!name) return jsonError(400, 'name is required')

  const description = typeof body.description === 'string' ? body.description.trim() : null
  const permissions = filterToProjectTemplatePermissions(
    Array.isArray(body.permissions) ? body.permissions.filter((x) => typeof x === 'string') : [],
  )
  const slugInput = typeof body.slug === 'string' ? body.slug : name
  let slug = slugifyTeamRoleName(slugInput)
  if (!slug) slug = slugifyTeamRoleName('custom_role')

  const supabase = createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) return jsonError(401, 'Unauthorized')

  const admin = createAdminClient()
  const allowed = await userCanManageOrganizationRoles(admin, user.id, organizationId)
  if (!allowed) return jsonError(403, 'Forbidden')

  const { data, error } = await admin
    .from('organization_team_roles')
    .insert({
      organization_id: organizationId,
      slug,
      name,
      description: description || null,
      permissions,
    })
    .select('id,organization_id,slug,name,description,permissions')
    .single()

  if (error) {
    if (error.code === '23505') return jsonError(409, 'A team role with this name already exists.')
    return jsonError(500, error.message)
  }

  const role = {
    id: String(data.id),
    organization_id: organizationId,
    slug: String(data.slug),
    name: String(data.name),
    description: (data.description as string | null) ?? null,
    permissions: filterToProjectTemplatePermissions(data.permissions),
  }

  await syncOrgTeamRoleToAllProjects(admin, organizationId, role.id, role)

  return NextResponse.json({ role })
}

export async function PATCH(request: Request, context: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await context.params
  if (!organizationId) return jsonError(400, 'Missing organization id')

  let parsed: unknown
  try {
    parsed = await request.json()
  } catch {
    return jsonError(400, 'Invalid JSON')
  }
  if (!parsed || typeof parsed !== 'object') return jsonError(400, 'Invalid body')
  const body = parsed as Record<string, unknown>

  const roleId = typeof body.roleId === 'string' ? body.roleId.trim() : ''
  if (!roleId) return jsonError(400, 'roleId is required')

  const patch: Record<string, unknown> = {}
  if (typeof body.name === 'string') {
    const name = body.name.trim().replace(/\s+/g, ' ')
    if (!name) return jsonError(400, 'name cannot be empty')
    patch.name = name
  }
  if (typeof body.description === 'string') patch.description = body.description.trim() || null
  if (Array.isArray(body.permissions)) {
    patch.permissions = filterToProjectTemplatePermissions(body.permissions.filter((x) => typeof x === 'string'))
  }
  if (Object.keys(patch).length === 0) return jsonError(400, 'No fields to update')

  const supabase = createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) return jsonError(401, 'Unauthorized')

  const admin = createAdminClient()
  const allowed = await userCanManageOrganizationRoles(admin, user.id, organizationId)
  if (!allowed) return jsonError(403, 'Forbidden')

  const { data, error } = await admin
    .from('organization_team_roles')
    .update(patch)
    .eq('organization_id', organizationId)
    .eq('id', roleId)
    .select('id,organization_id,slug,name,description,permissions')
    .single()

  if (error) return jsonError(500, error.message)

  const role = {
    id: String(data.id),
    organization_id: organizationId,
    slug: String(data.slug),
    name: String(data.name),
    description: (data.description as string | null) ?? null,
    permissions: filterToProjectTemplatePermissions(data.permissions),
  }

  await syncOrgTeamRoleToAllProjects(admin, organizationId, role.id, role)

  return NextResponse.json({ role })
}

export async function DELETE(request: Request, context: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await context.params
  if (!organizationId) return jsonError(400, 'Missing organization id')

  const { searchParams } = new URL(request.url)
  const roleId = searchParams.get('roleId')?.trim() ?? ''
  if (!roleId) return jsonError(400, 'roleId query param is required')

  const supabase = createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) return jsonError(401, 'Unauthorized')

  const admin = createAdminClient()
  const allowed = await userCanManageOrganizationRoles(admin, user.id, organizationId)
  if (!allowed) return jsonError(403, 'Forbidden')

  const { data: projectRoles } = await admin
    .from('project_team_roles')
    .select('id')
    .eq('organization_team_role_id', roleId)
  const projectRoleIds = (projectRoles ?? []).map((r) => String((r as { id: string }).id))

  if (projectRoleIds.length > 0) {
    const { count: memberCount, error: memberUsageError } = await admin
      .from('project_members')
      .select('id', { count: 'exact', head: true })
      .in('project_team_role_id', projectRoleIds)
    if (memberUsageError) return jsonError(500, memberUsageError.message)
    if ((memberCount ?? 0) > 0) {
      return jsonError(409, 'Cannot delete: members are assigned to this role on a project.')
    }
  }

  const { error } = await admin.from('organization_team_roles').delete().eq('organization_id', organizationId).eq('id', roleId)
  if (error) return jsonError(500, error.message)

  return NextResponse.json({ ok: true })
}

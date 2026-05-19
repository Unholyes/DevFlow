import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { userCanManageProjectMembers } from '@/lib/permissions/project-members-permissions'
import { filterToProjectTemplatePermissions } from '@/lib/permissions/project-template-permissions'
import { loadProjectTeamRoles } from '@/lib/permissions/team-roles'

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status })
}

async function loadProjectContext(supabase: ReturnType<typeof createClient>, projectId: string, userId: string) {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id,organization_id')
    .eq('id', projectId)
    .maybeSingle()

  if (projectError) return { error: jsonError(500, projectError.message) }
  if (!project?.id || !project.organization_id) return { error: jsonError(404, 'Project not found') }

  const organizationId = String(project.organization_id)

  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle()

  if (memberError) return { error: jsonError(500, memberError.message) }
  if (!membership?.id) return { error: jsonError(403, 'Forbidden') }

  return { projectId: project.id as string, organizationId }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await context.params
  if (!projectId) return jsonError(400, 'Missing project id')

  const supabase = createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) return jsonError(401, 'Unauthorized')

  const ctx = await loadProjectContext(supabase, projectId, user.id)
  if ('error' in ctx) return ctx.error

  const roles = await loadProjectTeamRoles(supabase, ctx.projectId, ctx.organizationId)
  return NextResponse.json({ roles, organizationId: ctx.organizationId })
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await context.params
  if (!projectId) return jsonError(400, 'Missing project id')

  let parsed: unknown
  try {
    parsed = await request.json()
  } catch {
    return jsonError(400, 'Invalid JSON')
  }
  if (!parsed || typeof parsed !== 'object') return jsonError(400, 'Invalid body')
  const body = parsed as Record<string, unknown>

  const action = typeof body.action === 'string' ? body.action : 'create'

  const supabase = createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) return jsonError(401, 'Unauthorized')

  const ctx = await loadProjectContext(supabase, projectId, user.id)
  if ('error' in ctx) return ctx.error

  const canManage = await userCanManageProjectMembers(supabase, {
    organizationId: ctx.organizationId,
    userId: user.id,
    projectId: ctx.projectId,
  })
  if (!canManage) return jsonError(403, 'Forbidden')

  const admin = createAdminClient()

  if (action === 'reset') {
    const roleId = typeof body.roleId === 'string' ? body.roleId.trim() : ''
    if (!roleId) return jsonError(400, 'roleId is required')

    const { data: projectRole, error: loadError } = await admin
      .from('project_team_roles')
      .select('id,organization_team_role_id')
      .eq('id', roleId)
      .eq('project_id', ctx.projectId)
      .maybeSingle()

    if (loadError) return jsonError(500, loadError.message)
    if (!projectRole?.organization_team_role_id) {
      return jsonError(400, 'Only workspace-linked roles can be reset to org defaults.')
    }

    const { data: orgRole, error: orgError } = await admin
      .from('organization_team_roles')
      .select('name,description,permissions')
      .eq('id', projectRole.organization_team_role_id)
      .maybeSingle()

    if (orgError || !orgRole) return jsonError(404, 'Workspace role not found')

    const { error: updateError } = await admin
      .from('project_team_roles')
      .update({
        name: orgRole.name,
        description: orgRole.description,
        permissions: orgRole.permissions,
        inherits_from_org: true,
      })
      .eq('id', roleId)

    if (updateError) return jsonError(500, updateError.message)
    return NextResponse.json({ ok: true })
  }

  if (action === 'update') {
    const roleId = typeof body.roleId === 'string' ? body.roleId.trim() : ''
    if (!roleId) return jsonError(400, 'roleId is required')

    const permissions = filterToProjectTemplatePermissions(
      Array.isArray(body.permissions) ? body.permissions.filter((x) => typeof x === 'string') : [],
    )

    const { data: existing, error: existingError } = await admin
      .from('project_team_roles')
      .select('organization_team_role_id')
      .eq('id', roleId)
      .eq('project_id', ctx.projectId)
      .maybeSingle()

    if (existingError) return jsonError(500, existingError.message)
    if (!existing) return jsonError(404, 'Role not found')

    const { error: updateError } = await admin
      .from('project_team_roles')
      .update({
        permissions,
        inherits_from_org: false,
      })
      .eq('id', roleId)

    if (updateError) return jsonError(500, updateError.message)
    return NextResponse.json({ ok: true })
  }

  // create project-only role
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
  if (!name) return jsonError(400, 'name is required')
  const description = typeof body.description === 'string' ? body.description.trim() : null
  const permissions = filterToProjectTemplatePermissions(
    Array.isArray(body.permissions) ? body.permissions.filter((x) => typeof x === 'string') : [],
  )

  const { data, error } = await admin
    .from('project_team_roles')
    .insert({
      project_id: ctx.projectId,
      organization_team_role_id: null,
      name,
      description: description || null,
      permissions,
      inherits_from_org: false,
    })
    .select('id,project_id,organization_team_role_id,name,description,permissions,inherits_from_org')
    .single()

  if (error) {
    if (error.code === '23505') return jsonError(409, 'A team role with this name already exists on this project.')
    return jsonError(500, error.message)
  }

  return NextResponse.json({
    role: {
      ...data,
      effectivePermissions: permissions,
    },
  })
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await context.params
  if (!projectId) return jsonError(400, 'Missing project id')

  const { searchParams } = new URL(request.url)
  const roleId = searchParams.get('roleId')?.trim() ?? ''
  if (!roleId) return jsonError(400, 'roleId is required')

  const supabase = createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) return jsonError(401, 'Unauthorized')

  const ctx = await loadProjectContext(supabase, projectId, user.id)
  if ('error' in ctx) return ctx.error

  const canManage = await userCanManageProjectMembers(supabase, {
    organizationId: ctx.organizationId,
    userId: user.id,
    projectId: ctx.projectId,
  })
  if (!canManage) return jsonError(403, 'Forbidden')

  const admin = createAdminClient()

  const { data: role, error: roleError } = await admin
    .from('project_team_roles')
    .select('id,organization_team_role_id')
    .eq('id', roleId)
    .eq('project_id', ctx.projectId)
    .maybeSingle()

  if (roleError) return jsonError(500, roleError.message)
  if (!role) return jsonError(404, 'Role not found')

  const { count, error: usageError } = await admin
    .from('project_members')
    .select('id', { count: 'exact', head: true })
    .eq('project_team_role_id', roleId)

  if (usageError) return jsonError(500, usageError.message)
  if ((count ?? 0) > 0) {
    return jsonError(409, 'Cannot delete: members are assigned to this role.')
  }

  if (role.organization_team_role_id) {
    const { error: excludeError } = await admin.from('project_excluded_organization_team_roles').upsert(
      {
        project_id: ctx.projectId,
        organization_team_role_id: role.organization_team_role_id,
      },
      { onConflict: 'project_id,organization_team_role_id' },
    )
    if (excludeError) {
      const code = String((excludeError as { code?: string }).code ?? '')
      const msg = String(excludeError.message ?? '')
      if (code !== 'PGRST205' && !msg.includes('project_excluded_organization_team_roles')) {
        return jsonError(500, excludeError.message)
      }
    }
  }

  const { error } = await admin.from('project_team_roles').delete().eq('id', roleId)
  if (error) return jsonError(500, error.message)

  return NextResponse.json({ ok: true })
}

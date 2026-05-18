import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { userCanManageProjectMembers } from '@/lib/permissions/project-members-permissions'
import {
  PROJECT_ACCESS_LEVELS,
  PROJECT_FUNCTIONAL_ROLES,
  defaultProjectTemplatePermissions,
  filterToProjectTemplatePermissions,
  type ProjectAccessLevel,
} from '@/lib/permissions/project-template-permissions'

const ACCESS_LEVELS = new Set<string>(PROJECT_ACCESS_LEVELS)
const FUNCTIONAL_ROLE_VALUES = new Set<string>(PROJECT_FUNCTIONAL_ROLES.map((r) => r.id))

async function loadProjectTemplatePermissions(
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
): Promise<Record<ProjectAccessLevel, string[]>> {
  const { data: templateRows } = await supabase
    .from('organization_project_access_templates')
    .select('access_level,permissions')
    .eq('organization_id', organizationId)

  const projectTemplatePermissions: Record<ProjectAccessLevel, string[]> = {
    Admin: defaultProjectTemplatePermissions('Admin'),
    Editor: defaultProjectTemplatePermissions('Editor'),
    Viewer: defaultProjectTemplatePermissions('Viewer'),
  }

  for (const level of PROJECT_ACCESS_LEVELS) {
    const row = (templateRows ?? []).find(
      (r) => String((r as { access_level?: unknown }).access_level ?? '') === level,
    ) as { permissions?: unknown } | undefined
    if (row?.permissions != null) {
      projectTemplatePermissions[level] = filterToProjectTemplatePermissions(row.permissions)
    }
  }

  return projectTemplatePermissions
}

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
  if (!project?.id || !project.organization_id) {
    return { error: jsonError(404, 'Project not found') }
  }

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

  const [{ data: orgMembers, error: orgMembersError }, { data: teams, error: teamsError }, { data: members, error: membersError }] =
    await Promise.all([
      supabase
        .from('organization_members')
        .select(
          `
          user_id,
          profiles:user_id (
            id,
            full_name,
            email
          )
        `,
        )
        .eq('organization_id', ctx.organizationId)
        .order('joined_at', { ascending: true }),
      supabase
        .from('teams')
        .select('id,name,description')
        .eq('organization_id', ctx.organizationId)
        .order('name', { ascending: true }),
      supabase
        .from('project_members')
        .select('id,user_id,project_access_level,functional_role,joined_at')
        .eq('project_id', ctx.projectId)
        .eq('organization_id', ctx.organizationId)
        .order('joined_at', { ascending: true }),
    ])

  if (orgMembersError) return jsonError(500, orgMembersError.message)
  if (teamsError) return jsonError(500, teamsError.message)
  if (membersError) return jsonError(500, membersError.message)

  const users = (orgMembers ?? [])
    .map((row) => {
      const userId = String((row as { user_id?: unknown }).user_id ?? '')
      const profile = (row as { profiles?: { full_name?: string | null; email?: string | null } | null }).profiles
      const fullName = String(profile?.full_name ?? '').trim()
      const email = String(profile?.email ?? '').trim()
      return {
        kind: 'user' as const,
        id: userId,
        label: fullName || email || 'Unknown user',
        subtitle: email || undefined,
      }
    })
    .filter((u) => u.id.length > 0)

  const teamOptions = (teams ?? []).map((t) => ({
    kind: 'team' as const,
    id: String((t as { id?: unknown }).id ?? ''),
    label: String((t as { name?: unknown }).name ?? 'Team'),
    subtitle: (t as { description?: string | null }).description
      ? String((t as { description?: string | null }).description)
      : 'Workspace team',
  }))

  const memberRows = (members ?? []).map((m) => ({
    id: String((m as { id?: unknown }).id ?? ''),
    userId: String((m as { user_id?: unknown }).user_id ?? ''),
    projectAccessLevel: String((m as { project_access_level?: unknown }).project_access_level ?? 'Viewer'),
    functionalRole: ((m as { functional_role?: unknown }).functional_role ?? null) as string | null,
    joinedAt: String((m as { joined_at?: unknown }).joined_at ?? ''),
  }))

  const projectTemplatePermissions = await loadProjectTemplatePermissions(supabase, ctx.organizationId)

  return NextResponse.json({
    organizationId: ctx.organizationId,
    assignees: [...users, ...teamOptions],
    members: memberRows,
    projectTemplatePermissions,
    functionalRoles: PROJECT_FUNCTIONAL_ROLES,
  })
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
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

  const canManage = await userCanManageProjectMembers(supabase, {
    organizationId: ctx.organizationId,
    userId: user.id,
    projectId: ctx.projectId,
  })
  if (!canManage) {
    return jsonError(403, 'You do not have permission to manage this project team')
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError(400, 'Invalid JSON')
  }

  const parsed = body as Record<string, unknown>
  const kind = parsed.kind === 'team' ? 'team' : parsed.kind === 'user' ? 'user' : null
  const assigneeId = typeof parsed.assigneeId === 'string' ? parsed.assigneeId.trim() : ''
  const projectAccessLevel =
    typeof parsed.project_access_level === 'string' ? parsed.project_access_level : ''
  const functionalRole =
    typeof parsed.functional_role === 'string' && parsed.functional_role.trim().length > 0
      ? parsed.functional_role.trim()
      : null

  if (!kind || !assigneeId) {
    return jsonError(400, 'kind and assigneeId are required')
  }
  if (!ACCESS_LEVELS.has(projectAccessLevel)) {
    return jsonError(400, 'Invalid project_access_level')
  }
  if (functionalRole && !FUNCTIONAL_ROLE_VALUES.has(functionalRole)) {
    return jsonError(400, 'Invalid functional_role')
  }

  const admin = createAdminClient()
  let userIds: string[] = []

  if (kind === 'user') {
    const { data: orgMember, error: orgMemberError } = await admin
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', ctx.organizationId)
      .eq('user_id', assigneeId)
      .maybeSingle()

    if (orgMemberError) return jsonError(500, orgMemberError.message)
    if (!orgMember?.user_id) {
      return jsonError(400, 'User is not a member of this organization')
    }
    userIds = [assigneeId]
  } else {
    const { data: team, error: teamError } = await admin
      .from('teams')
      .select('id,organization_id')
      .eq('id', assigneeId)
      .maybeSingle()

    if (teamError) return jsonError(500, teamError.message)
    if (!team?.id || String(team.organization_id) !== ctx.organizationId) {
      return jsonError(400, 'Team not found in this organization')
    }

    const { data: teamMembers, error: teamMembersError } = await admin
      .from('team_members')
      .select('user_id')
      .eq('team_id', assigneeId)

    if (teamMembersError) return jsonError(500, teamMembersError.message)

    userIds = (teamMembers ?? [])
      .map((m) => String((m as { user_id?: unknown }).user_id ?? ''))
      .filter(Boolean)

    if (userIds.length === 0) {
      return jsonError(400, 'Team has no members to assign')
    }

    const { data: orgMemberships, error: orgMembershipsError } = await admin
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', ctx.organizationId)
      .in('user_id', userIds)

    if (orgMembershipsError) return jsonError(500, orgMembershipsError.message)

    const allowed = new Set((orgMemberships ?? []).map((m) => String((m as { user_id?: unknown }).user_id ?? '')))
    userIds = userIds.filter((id) => allowed.has(id))

    if (userIds.length === 0) {
      return jsonError(400, 'No team members belong to this organization')
    }
  }

  const rows = userIds.map((userId) => ({
    organization_id: ctx.organizationId,
    project_id: ctx.projectId,
    user_id: userId,
    project_access_level: projectAccessLevel,
    functional_role: functionalRole,
  }))

  const { data: upserted, error: upsertError } = await supabase
    .from('project_members')
    .upsert(rows, { onConflict: 'project_id,user_id' })
    .select('id,user_id,project_access_level,functional_role')

  if (upsertError) {
    if (upsertError.code === '42P01') {
      return jsonError(
        500,
        'Project members table is missing. Apply project_members migrations and reload the schema cache.',
      )
    }
    return jsonError(500, upsertError.message)
  }

  return NextResponse.json({
    ok: true,
    assignedCount: upserted?.length ?? rows.length,
    members: upserted ?? [],
  })
}

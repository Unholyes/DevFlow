import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function jsonError(status: number, code: string, error: string) {
  return NextResponse.json({ ok: false, code, error }, { status })
}

type TeamRole = 'lead' | 'member'

function normalizeUserIds(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map((v) => String(v ?? '').trim()).filter(Boolean)
  }
  const single = typeof input === 'string' ? input.trim() : ''
  return single ? [single] : []
}

function isTeamRole(v: unknown): v is TeamRole {
  return v === 'lead' || v === 'member'
}

async function getTeamOrgId(admin: ReturnType<typeof createAdminClient>, teamId: string) {
  const { data: team, error } = await admin.from('teams').select('id,organization_id').eq('id', teamId).maybeSingle()
  if (error) return { ok: false as const, response: jsonError(500, 'TEAM_LOOKUP_FAILED', error.message) }
  if (!team?.organization_id) return { ok: false as const, response: jsonError(404, 'TEAM_NOT_FOUND', 'Team not found') }
  return { ok: true as const, organizationId: String((team as any).organization_id) }
}

async function assertOrgAdmin(admin: ReturnType<typeof createAdminClient>, organizationId: string, userId: string) {
  const { data: membership, error } = await admin
    .from('organization_members')
    .select('system_role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return { ok: false as const, response: jsonError(500, 'ORG_ROLE_LOOKUP_FAILED', error.message) }

  const role = String((membership as any)?.system_role ?? 'Member')
  if (role !== 'Owner' && role !== 'Admin') {
    return { ok: false as const, response: jsonError(403, 'FORBIDDEN', 'Forbidden') }
  }

  return { ok: true as const }
}

async function assertOrgMember(admin: ReturnType<typeof createAdminClient>, organizationId: string, userId: string) {
  const { data: membership, error } = await admin
    .from('organization_members')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return { ok: false as const, response: jsonError(500, 'ORG_ROLE_LOOKUP_FAILED', error.message) }
  if (!membership) return { ok: false as const, response: jsonError(403, 'FORBIDDEN', 'Forbidden') }
  return { ok: true as const }
}

export async function GET(_request: Request, context: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await context.params
  if (!teamId) return jsonError(400, 'MISSING_TEAM_ID', 'Missing teamId')

  const supabase = createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return jsonError(401, 'UNAUTHORIZED', 'Unauthorized')

  const admin = createAdminClient()
  const teamOrg = await getTeamOrgId(admin, teamId)
  if (!teamOrg.ok) return teamOrg.response

  const memberCheck = await assertOrgMember(admin, teamOrg.organizationId, user.id)
  if (!memberCheck.ok) return memberCheck.response

  const { data: rows, error } = await supabase
    .from('team_members')
    .select(
      `
      team_id,
      user_id,
      team_role,
      created_at,
      profiles:user_id (
        id,
        full_name,
        email
      )
    `,
    )
    .eq('team_id', teamId)
    .order('created_at', { ascending: true })

  if (error) return jsonError(500, 'TEAM_MEMBERS_LIST_FAILED', error.message)
  return NextResponse.json({ ok: true, members: rows ?? [] })
}

export async function POST(request: Request, context: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await context.params
  if (!teamId) return jsonError(400, 'MISSING_TEAM_ID', 'Missing teamId')

  const supabase = createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return jsonError(401, 'UNAUTHORIZED', 'Unauthorized')

  let body: any = null
  try {
    body = await request.json()
  } catch {
    return jsonError(400, 'INVALID_JSON', 'Invalid JSON')
  }

  const userIds = normalizeUserIds(body?.userIds ?? body?.user_ids ?? body?.userId ?? body?.user_id)
  const teamRoleRaw = body?.team_role ?? body?.teamRole ?? 'member'
  const teamRole: TeamRole = isTeamRole(teamRoleRaw) ? teamRoleRaw : 'member'

  if (userIds.length === 0) return jsonError(400, 'MISSING_USER_IDS', 'Missing userIds')
  if (userIds.length > 50) return jsonError(400, 'TOO_MANY_USER_IDS', 'Too many users in one request')

  const admin = createAdminClient()
  const teamOrg = await getTeamOrgId(admin, teamId)
  if (!teamOrg.ok) return teamOrg.response

  const adminCheck = await assertOrgAdmin(admin, teamOrg.organizationId, user.id)
  if (!adminCheck.ok) return adminCheck.response

  // Safety: only allow adding users who are already members of the org.
  const { data: orgMembers, error: orgMemberError } = await admin
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', teamOrg.organizationId)
    .in('user_id', userIds)

  if (orgMemberError) return jsonError(500, 'ORG_MEMBER_LOOKUP_FAILED', orgMemberError.message)

  const allowed = new Set((orgMembers ?? []).map((r: any) => String(r.user_id)))
  const filtered = userIds.filter((id) => allowed.has(id))
  if (filtered.length === 0) return jsonError(400, 'USERS_NOT_IN_ORG', 'No provided users are members of this organization.')

  const insertRows = filtered.map((uid) => ({
    team_id: teamId,
    user_id: uid,
    team_role: teamRole,
  }))

  const { error: insertError } = await admin.from('team_members').insert(insertRows)
  if (insertError) {
    const msg = insertError.message ?? 'Failed to add members'
    const isDup = (insertError as any)?.code === '23505'
    return jsonError(isDup ? 409 : 400, isDup ? 'TEAM_MEMBER_ALREADY_EXISTS' : 'TEAM_MEMBER_ADD_FAILED', isDup ? 'One or more users are already on this team.' : msg)
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request, context: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await context.params
  if (!teamId) return jsonError(400, 'MISSING_TEAM_ID', 'Missing teamId')

  const supabase = createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return jsonError(401, 'UNAUTHORIZED', 'Unauthorized')

  let body: any = null
  try {
    body = await request.json().catch(() => null)
  } catch {
    body = null
  }

  const userId = String(body?.userId ?? body?.user_id ?? '').trim()
  if (!userId) return jsonError(400, 'MISSING_USER_ID', 'Missing userId')

  const admin = createAdminClient()
  const teamOrg = await getTeamOrgId(admin, teamId)
  if (!teamOrg.ok) return teamOrg.response

  const adminCheck = await assertOrgAdmin(admin, teamOrg.organizationId, user.id)
  if (!adminCheck.ok) return adminCheck.response

  const { error: delError } = await admin.from('team_members').delete().eq('team_id', teamId).eq('user_id', userId)
  if (delError) return jsonError(500, 'TEAM_MEMBER_REMOVE_FAILED', delError.message)

  return NextResponse.json({ ok: true })
}


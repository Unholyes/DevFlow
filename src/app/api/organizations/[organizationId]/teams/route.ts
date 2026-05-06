import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function jsonError(status: number, code: string, error: string) {
  return NextResponse.json({ ok: false, code, error }, { status })
}

function normalizeTeamName(value: unknown) {
  const raw = typeof value === 'string' ? value : ''
  const name = raw.trim().replace(/\s+/g, ' ')
  return name
}

function normalizeDescription(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
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

export async function GET(_request: Request, context: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await context.params
  if (!organizationId) return jsonError(400, 'MISSING_ORGANIZATION_ID', 'Missing organizationId')

  const supabase = createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return jsonError(401, 'UNAUTHORIZED', 'Unauthorized')

  const admin = createAdminClient()
  const memberCheck = await assertOrgMember(admin, organizationId, user.id)
  if (!memberCheck.ok) return memberCheck.response

  const { data: teams, error } = await supabase
    .from('teams')
    .select('id,organization_id,name,description,created_by,created_at,updated_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true })

  if (error) return jsonError(500, 'TEAMS_LIST_FAILED', error.message)
  return NextResponse.json({ ok: true, teams: teams ?? [] })
}

export async function POST(request: Request, context: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await context.params
  if (!organizationId) return jsonError(400, 'MISSING_ORGANIZATION_ID', 'Missing organizationId')

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

  const name = normalizeTeamName(body?.name)
  const description = normalizeDescription(body?.description)

  if (name.length < 2) return jsonError(400, 'TEAM_NAME_TOO_SHORT', 'Team name must be at least 2 characters.')
  if (name.length > 50) return jsonError(400, 'TEAM_NAME_TOO_LONG', 'Team name must be 50 characters or fewer.')
  if (!/^[\p{L}\p{N}][\p{L}\p{N}\s._-]*$/u.test(name)) {
    return jsonError(400, 'TEAM_NAME_INVALID', 'Team name contains invalid characters.')
  }
  if (description && description.length > 280) {
    return jsonError(400, 'TEAM_DESCRIPTION_TOO_LONG', 'Description must be 280 characters or fewer.')
  }

  const admin = createAdminClient()
  const adminCheck = await assertOrgAdmin(admin, organizationId, user.id)
  if (!adminCheck.ok) return adminCheck.response

  // Create team (service role to guarantee insert) + add creator as lead.
  const { data: teamRow, error: createError } = await admin
    .from('teams')
    .insert({
      organization_id: organizationId,
      name,
      description,
      created_by: user.id,
    })
    .select('id,organization_id,name,description,created_by,created_at,updated_at')
    .single()

  if (createError) {
    const msg = createError.message ?? 'Failed to create team'
    const isDup = (createError as any)?.code === '23505'
    return jsonError(isDup ? 409 : 400, isDup ? 'TEAM_NAME_CONFLICT' : 'TEAM_CREATE_FAILED', isDup ? 'A team with that name already exists.' : msg)
  }
  if (!teamRow?.id) return jsonError(500, 'TEAM_CREATE_FAILED', 'Failed to create team')

  const { error: memberError } = await admin.from('team_members').insert({
    team_id: teamRow.id,
    user_id: user.id,
    team_role: 'lead',
  })

  if (memberError && (memberError as any)?.code !== '23505') {
    // Team created but membership failed; surface clearly so UI can retry.
    return jsonError(500, 'TEAM_CREATOR_ADD_FAILED', memberError.message ?? 'Failed to add creator to team')
  }

  return NextResponse.json({ ok: true, team: teamRow }, { status: 200 })
}


import type { SupabaseClient } from '@supabase/supabase-js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value.trim())
}

/** Normalize team_id from body: undefined = omit, null = clear, string = set (validated). */
export async function resolveTeamIdForTask(
  supabase: SupabaseClient,
  orgId: string,
  teamIdRaw: unknown
): Promise<{ ok: true; teamId: string | null | undefined } | { ok: false; error: string; code: string; status: number }> {
  if (teamIdRaw === undefined) return { ok: true, teamId: undefined }
  if (teamIdRaw === null) return { ok: true, teamId: null }
  if (!isUuid(teamIdRaw)) {
    return { ok: false, error: 'Invalid team_id', code: 'INVALID_TEAM_ID', status: 400 }
  }
  const teamId = teamIdRaw.trim()
  const { data, error } = await supabase
    .from('teams')
    .select('id')
    .eq('id', teamId)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (error) return { ok: false, error: error.message, code: 'TEAM_LOOKUP_FAILED', status: 500 }
  if (!data?.id) {
    return { ok: false, error: 'Team not found or not in this organization.', code: 'TEAM_ORG_MISMATCH', status: 400 }
  }
  return { ok: true, teamId }
}

export async function resolveAssigneeIdForTask(
  supabase: SupabaseClient,
  orgId: string,
  assigneeIdRaw: unknown
): Promise<{ ok: true; assigneeId: string | null | undefined } | { ok: false; error: string; code: string; status: number }> {
  if (assigneeIdRaw === undefined) return { ok: true, assigneeId: undefined }
  if (assigneeIdRaw === null) return { ok: true, assigneeId: null }
  if (!isUuid(assigneeIdRaw)) {
    return { ok: false, error: 'Invalid assignee_id', code: 'INVALID_ASSIGNEE_ID', status: 400 }
  }
  const userId = assigneeIdRaw.trim()
  const { data, error } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return { ok: false, error: error.message, code: 'MEMBER_LOOKUP_FAILED', status: 500 }
  if (!data?.user_id) {
    return { ok: false, error: 'Assignee is not a member of this organization.', code: 'ASSIGNEE_NOT_IN_ORG', status: 400 }
  }
  return { ok: true, assigneeId: userId }
}

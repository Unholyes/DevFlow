import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { userCanManageOrganizationRoles } from '@/lib/permissions/can-manage-organization-roles'

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string')
}

/**
 * Update a member's custom_roles.
 * - Owners/Admins may update.
 * - Members may update only if they have `account.users.invite`/`account.users.remove` (or legacy `account.members.manage`) via a custom role.
 * - Validates that provided role names exist in organization_roles for this org.
 */
export async function POST(request: Request, context: { params: Promise<{ organizationId: string; memberId: string }> }) {
  const { organizationId, memberId } = await context.params

  if (!organizationId || !memberId) {
    return NextResponse.json({ error: 'Missing organizationId or memberId' }, { status: 400 })
  }

  const supabase = createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let parsed: unknown
  try {
    parsed = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const next = (parsed as any)?.custom_roles
  if (!isStringArray(next)) {
    return NextResponse.json({ error: 'custom_roles must be a string array' }, { status: 400 })
  }

  const admin = createAdminClient()
  const allowed = await userCanManageOrganizationRoles(admin, user.id, organizationId)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Validate role names against existing organization_roles.
  const normalized = next.map((r) => r.trim().replace(/\s+/g, ' ')).filter(Boolean)
  if (normalized.length > 0) {
    const { data: existing, error: existingError } = await admin
      .from('organization_roles')
      .select('name')
      .eq('organization_id', organizationId)
      .in('name', normalized)

    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })
    const present = new Set((existing ?? []).map((r: any) => String(r.name).toLowerCase()))
    const missing = normalized.filter((n) => !present.has(n.toLowerCase()))
    if (missing.length > 0) {
      return NextResponse.json({ error: `Unknown role(s): ${missing.join(', ')}` }, { status: 400 })
    }
  }

  const { data: updated, error: updateError } = await admin
    .from('organization_members')
    .update({ custom_roles: normalized })
    .eq('id', memberId)
    .eq('organization_id', organizationId)
    .select('id,custom_roles')

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  if (!updated?.length) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  return NextResponse.json({ ok: true })
}


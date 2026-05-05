import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canonicalBuiltinRoleKey, userCanManageOrganizationRoles } from '@/lib/permissions/can-manage-organization-roles'

const DEFAULT_SEED_ROLES = ['Admin', 'Project Manager', 'Member'] as const

/**
 * Inserts missing built-in rows in organization_default_roles only.
 * Does not upsert: upsert with empty permissions was wiping saved permission arrays on every call.
 */
export async function POST(_request: Request, context: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await context.params

  if (!organizationId) {
    return NextResponse.json({ error: 'Missing organization id' }, { status: 400 })
  }

  const supabase = createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const allowed = await userCanManageOrganizationRoles(admin, user.id, organizationId)

  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: existing, error: existingError } = await admin
    .from('organization_default_roles')
    .select('role')
    .eq('organization_id', organizationId)

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 })
  }

  const present = new Set<string>()
  for (const row of existing ?? []) {
    const canon = canonicalBuiltinRoleKey(String((row as { role?: unknown }).role ?? ''))
    if (canon) present.add(canon)
  }

  const missing = DEFAULT_SEED_ROLES.filter((role) => !present.has(role))
  if (missing.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0 })
  }

  const seedRows = missing.map((role) => ({
    organization_id: organizationId,
    role,
    permissions: [] as unknown[],
  }))

  const { error: insertError } = await admin.from('organization_default_roles').insert(seedRows)

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, inserted: missing.length })
}

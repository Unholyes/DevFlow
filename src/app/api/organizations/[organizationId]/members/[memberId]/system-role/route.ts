import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type SystemRole = 'Owner' | 'Admin' | 'Member'

function isSystemRole(v: unknown): v is SystemRole {
  return v === 'Owner' || v === 'Admin' || v === 'Member'
}

/**
 * Update a member's system_role.
 * - Only Owners may change system_role.
 * - Prevent demoting the last Owner in an organization.
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

  const nextRole = (parsed as any)?.system_role
  if (!isSystemRole(nextRole)) {
    return NextResponse.json({ error: 'Invalid system_role' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Caller must be an Owner in this org.
  const { data: callerMembership, error: callerError } = await admin
    .from('organization_members')
    .select('system_role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (callerError) return NextResponse.json({ error: callerError.message }, { status: 500 })
  if (!callerMembership || (callerMembership as any).system_role !== 'Owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: targetMember, error: targetError } = await admin
    .from('organization_members')
    .select('id,system_role')
    .eq('id', memberId)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (targetError) return NextResponse.json({ error: targetError.message }, { status: 500 })
  if (!targetMember) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const prevRole = String((targetMember as any).system_role ?? 'Member') as SystemRole

  // Prevent demoting the last owner.
  if (prevRole === 'Owner' && nextRole !== 'Owner') {
    const { count, error: ownersCountError } = await admin
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('system_role', 'Owner')

    if (ownersCountError) return NextResponse.json({ error: ownersCountError.message }, { status: 500 })
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: 'Cannot demote the last Owner of an organization.' }, { status: 400 })
    }
  }

  const { data: updated, error: updateError } = await admin
    .from('organization_members')
    .update({ system_role: nextRole })
    .eq('id', memberId)
    .eq('organization_id', organizationId)
    .select('id,system_role')

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  if (!updated?.length) return NextResponse.json({ error: 'Update did not apply.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}


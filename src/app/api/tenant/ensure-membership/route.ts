import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TENANT_SLUG_HEADER } from '@/lib/tenant/resolve'

export async function POST(request: Request) {
  const supabase = createClient()
  const admin = createAdminClient()

  try {
    const tenantSlug = request.headers.get(TENANT_SLUG_HEADER)
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Missing tenant context' }, { status: 400 })
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve org by slug (admin bypasses RLS)
    const { data: org, error: orgError } = await admin
      .from('organizations')
      .select('id')
      .eq('slug', tenantSlug)
      .maybeSingle()

    if (orgError) {
      return NextResponse.json({ error: 'Failed to resolve organization' }, { status: 500 })
    }
    if (!org?.id) {
      return NextResponse.json({ error: 'Invalid tenant context' }, { status: 400 })
    }

    // Enforce one-org-per-user: user cannot join a different organization once attached.
    const { data: existingAnyMembership } = await admin
      .from('organization_members')
      .select('organization_id,organizations:organization_id ( id,slug )')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingAnyMembership?.organization_id && existingAnyMembership.organization_id !== org.id) {
      const slug = (existingAnyMembership as any)?.organizations?.slug as string | undefined
      return NextResponse.json(
        { error: `User already belongs to organization "${slug ?? existingAnyMembership.organization_id}".` },
        { status: 409 },
      )
    }

    const { data: existing, error: existingError } = await admin
      .from('organization_members')
      .select('id,system_role')
      .eq('organization_id', org.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: 'Failed to check membership' }, { status: 500 })
    }

    if (existing?.id) {
      const systemRole = String((existing as any)?.system_role ?? 'Member')
      return NextResponse.json({ organizationId: org.id, status: systemRole.toLowerCase() })
    }

    // If the user is a tenant_admin at the app level, treat them as an Owner by default.
    // (This ensures tenant_admin users have a membership row to satisfy org-scoped queries/RLS.)
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role === 'tenant_admin') {
      const { data: inserted, error: insertError } = await admin
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: user.id,
          system_role: 'Owner',
          custom_roles: [] as unknown[],
        })
        .select('id,system_role')
        .single()

      if (insertError) {
        return NextResponse.json({ error: insertError.message ?? 'Failed to create membership' }, { status: 500 })
      }

      return NextResponse.json({ organizationId: org.id, status: String((inserted as any)?.system_role ?? 'Owner').toLowerCase() })
    }

    // IMPORTANT: this endpoint is an *enforcer*, not an auto-join mechanism for regular users.
    return NextResponse.json({ error: "You don't have access to this organization." }, { status: 403 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Internal server error' }, { status: 500 })
  }
}


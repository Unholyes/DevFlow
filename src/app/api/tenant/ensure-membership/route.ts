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
      .select('id,owner_id')
      .eq('slug', tenantSlug)
      .maybeSingle()

    if (orgError) {
      return NextResponse.json({ error: 'Failed to resolve organization' }, { status: 500 })
    }
    if (!org?.id) {
      return NextResponse.json({ error: 'Invalid tenant context' }, { status: 400 })
    }

    // Owners implicitly have access; don't create duplicate membership rows.
    if (org.owner_id === user.id) {
      return NextResponse.json({ organizationId: org.id, status: 'owner' })
    }

    const { data: existing, error: existingError } = await admin
      .from('organization_members')
      .select('id,role')
      .eq('organization_id', org.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: 'Failed to check membership' }, { status: 500 })
    }

    if (existing?.id) {
      return NextResponse.json({ organizationId: org.id, status: 'exists', role: existing.role })
    }

    // Create membership as member (never admin from tenant auth).
    const { data: inserted, error: insertError } = await admin
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: 'member',
      })
      .select('id,role')
      .single()

    if (insertError) {
      // Most common: unique constraint violation if a race happens.
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({ organizationId: org.id, status: 'created', role: inserted.role })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Internal server error' }, { status: 500 })
  }
}


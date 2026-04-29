import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TENANT_SLUG_HEADER } from '@/lib/tenant/resolve'

function base64UrlFromBytes(bytes: Uint8Array) {
  const b64 = Buffer.from(bytes).toString('base64')
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function resolveOriginFromHeaders(headers: Headers) {
  const proto = headers.get('x-forwarded-proto') ?? 'https'
  const host = headers.get('x-forwarded-host') ?? headers.get('host') ?? ''
  return `${proto}://${host}`
}

export async function POST(request: Request) {
  const supabase = createClient()
  const admin = createAdminClient()

  try {
    const body = await request.json().catch(() => null)
    const email = String(body?.email ?? '').trim().toLowerCase()
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    const organizationIdFromBody = String(body?.organizationId ?? '').trim() || null

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantSlug = request.headers.get(TENANT_SLUG_HEADER)

    // Resolve org (service role) either via tenantSlug (preferred) or explicit organizationId from body.
    const orgQuery = admin.from('organizations').select('id,owner_id,slug').limit(1)
    const { data: org, error: orgError } = tenantSlug
      ? await orgQuery.eq('slug', tenantSlug).maybeSingle()
      : organizationIdFromBody
        ? await orgQuery.eq('id', organizationIdFromBody).maybeSingle()
        : { data: null as any, error: null as any }

    if (!tenantSlug && !organizationIdFromBody) {
      return NextResponse.json(
        { error: 'Missing tenant context (provide tenant subdomain or organizationId).' },
        { status: 400 },
      )
    }

    if (orgError) return NextResponse.json({ error: 'Failed to resolve organization' }, { status: 500 })
    if (!org?.id) return NextResponse.json({ error: 'Invalid tenant context' }, { status: 400 })

    // Only owner/admin can invite
    if (org.owner_id !== user.id) {
      const { data: membership } = await admin
        .from('organization_members')
        .select('role')
        .eq('organization_id', org.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (membership?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Enforce uniqueness: no multiple pending invites for same email
    const { data: existing } = await admin
      .from('team_invitations')
      .select('id')
      .eq('organization_id', org.id)
      .eq('status', 'pending')
      .ilike('email', email)
      .limit(1)
      .maybeSingle()

    if (existing?.id) {
      return NextResponse.json({ error: 'An invite is already pending for this email.' }, { status: 409 })
    }

    // Enforce one-org-per-user:
    // If the invited email already maps to an existing user (profiles.email) who is attached to ANY org,
    // block the invite to prevent cross-org membership.
    const { data: invitedProfile } = await admin
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle()

    const invitedUserId = invitedProfile?.id ?? null

    if (invitedUserId) {
      const { data: owned } = await admin
        .from('organizations')
        .select('id,slug')
        .eq('owner_id', invitedUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (owned?.id && owned.id !== org.id) {
        return NextResponse.json(
          { error: `That user already belongs to organization "${owned.slug}".` },
          { status: 409 },
        )
      }

      const { data: existingMembership } = await admin
        .from('organization_members')
        .select('organization_id,organizations:organization_id ( id,slug )')
        .eq('user_id', invitedUserId)
        .order('joined_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingMembership?.organization_id && existingMembership.organization_id !== org.id) {
        const slug = (existingMembership as any)?.organizations?.slug as string | undefined
        return NextResponse.json(
          { error: `That user already belongs to organization "${slug ?? existingMembership.organization_id}".` },
          { status: 409 },
        )
      }
    }

    // Create our own pending invite record (drives the UI list)
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    const token = base64UrlFromBytes(bytes)

    const { data: inviteRow, error: insertError } = await admin
      .from('team_invitations')
      .insert({
        organization_id: org.id,
        email,
        token,
        inviter_id: user.id,
        status: 'pending',
      })
      .select('id,email,created_at')
      .single()

    if (insertError) {
      const message = insertError.message ?? 'Failed to create invite.'
      const isDup = (insertError as any)?.code === '23505'
      return NextResponse.json({ error: isDup ? 'An invite is already pending for this email.' : message }, { status: isDup ? 409 : 400 })
    }

    // Send email automatically via Supabase Auth invite email.
    // NOTE: Delivery depends on your Supabase Auth SMTP/email configuration.
    const origin = resolveOriginFromHeaders(new Headers(request.headers))
    const redirectTo = `${origin}/auth/invite/${token}`

    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
    })

    if (inviteError) {
      // Keep the pending row, but report email failure.
      return NextResponse.json(
        { invite: inviteRow, warning: `Invite saved but email failed to send: ${inviteError.message}` },
        { status: 200 },
      )
    }

    return NextResponse.json({ invite: inviteRow }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Internal server error' }, { status: 500 })
  }
}


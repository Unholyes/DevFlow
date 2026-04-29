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
    const tenantSlug = request.headers.get(TENANT_SLUG_HEADER)
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Missing tenant context' }, { status: 400 })
    }

    const body = await request.json().catch(() => null)
    const email = String(body?.email ?? '').trim().toLowerCase()
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve org by slug (service role)
    const { data: org, error: orgError } = await admin
      .from('organizations')
      .select('id,owner_id')
      .eq('slug', tenantSlug)
      .maybeSingle()

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


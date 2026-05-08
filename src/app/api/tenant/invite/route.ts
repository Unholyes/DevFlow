import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TENANT_SLUG_HEADER } from '@/lib/tenant/resolve'
import { customRolesIncludeManageMembers } from '@/lib/permissions/can-manage-organization-roles'

function permissionListHasInviteUsers(perms: unknown): boolean {
  if (!Array.isArray(perms)) return false
  return perms.some((p) => typeof p === 'string' && ['account.users.invite', 'account.members.manage'].includes(p.toLowerCase()))
}

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

  async function findAuthUserIdByEmail(email: string): Promise<string | null> {
    // NOTE: supabase-js GoTrueAdminApi.listUsers() does not reliably support server-side filtering by email
    // in stable releases. If `filter` is ignored, it can return unrelated users and break invite logic.
    // We page through users and match client-side to keep correctness.
    const normalized = email.trim().toLowerCase()
    if (!normalized) return null

    const perPage = 200
    const maxPages = 50 // up to 10k users scanned; keep bounded.

    for (let page = 1; page <= maxPages; page++) {
      const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({
        page,
        perPage,
      } as any)

      if (usersError) throw usersError

      const users = usersData?.users ?? []
      const found = users.find((u: any) => String(u?.email ?? '').trim().toLowerCase() === normalized)
      if (found?.id) return String(found.id)

      // If fewer than perPage results returned, we're at the end.
      if (users.length < perPage) return null
    }

    return null
  }

  try {
    const body = await request.json().catch(() => null)
    const email = String(body?.email ?? '').trim().toLowerCase()
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    const organizationIdFromBody = String(body?.organizationId ?? '').trim() || null
    const requestedSystemRoleRaw = body?.system_role ?? body?.systemRole ?? null

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

    // Invite permissions are derived from organization_members.system_role:
    // - Owner: can invite Owners/Admins/Members
    // - Admin: can invite Members only IF the Admin default-role permissions include account.users.invite (or legacy account.members.manage)
    // - Member: may invite Members only IF any assigned custom role includes account.users.invite (or legacy account.members.manage)
    const { data: inviterMembership, error: inviterError } = await admin
      .from('organization_members')
      .select('system_role,custom_roles')
      .eq('organization_id', org.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (inviterError) return NextResponse.json({ error: inviterError.message }, { status: 500 })
    const inviterSystemRole = String((inviterMembership as any)?.system_role ?? 'Member')
    const isOwner = inviterSystemRole === 'Owner'
    const isAdmin = inviterSystemRole === 'Admin'

    let canInvite = false
    if (isOwner) {
      canInvite = true
    } else if (isAdmin) {
      const { data: defaults, error: defaultsError } = await admin
        .from('organization_default_roles')
        .select('role,permissions')
        .eq('organization_id', org.id)
        .eq('role', 'Admin')
        .maybeSingle()
      if (defaultsError) return NextResponse.json({ error: defaultsError.message }, { status: 500 })
      canInvite = permissionListHasInviteUsers((defaults as any)?.permissions)
    } else {
      const assigned = Array.isArray((inviterMembership as any)?.custom_roles)
        ? (((inviterMembership as any).custom_roles as unknown[]).filter((r) => typeof r === 'string') as string[])
        : []
      const { data: customRows, error: customError } = await admin
        .from('organization_roles')
        .select('id,name,permissions')
        .eq('organization_id', org.id)
      if (customError) return NextResponse.json({ error: customError.message }, { status: 500 })
      canInvite = customRolesIncludeManageMembers(assigned, (customRows ?? []) as any)
    }

    if (!canInvite) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Decide invited system_role (Admins are forced to Member invites)
    const requested = typeof requestedSystemRoleRaw === 'string' ? requestedSystemRoleRaw : ''
    const normalizedRequested = requested.trim()
    const requestedSystemRole =
      normalizedRequested === 'Owner' || normalizedRequested === 'Admin' || normalizedRequested === 'Member'
        ? (normalizedRequested as 'Owner' | 'Admin' | 'Member')
        : 'Member'

    const invitedSystemRole = isOwner ? requestedSystemRole : 'Member'

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
    // If the invited email already maps to an existing auth user who is attached to ANY org,
    // block the invite to prevent cross-org membership.
    let invitedUserId: string | null = null
    try {
      invitedUserId = await findAuthUserIdByEmail(email)
    } catch (e: any) {
      console.error('Failed to resolve invited user by email:', e)
      return NextResponse.json({ error: 'Failed to resolve invited user' }, { status: 500 })
    }

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
        system_role: invitedSystemRole,
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
    // Route through /auth/callback so we can exchange the invite `code` for a session cookie
    // before rendering the set-password screen.
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(`/auth/invite/${token}`)}`

    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
    })

    if (inviteError) {
      // Keep the pending row, but report email failure.
      // If the user already exists (e.g. previously invited), Supabase won't send another invite email.
      // In that case, generate a magiclink so the admin can resend a working link.
      const msg = inviteError.message ?? 'Email failed to send'
      const alreadyRegistered = /already been registered|already registered|user already registered/i.test(msg)

      if (alreadyRegistered) {
        const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: {
            redirectTo,
          },
        } as any)

        const actionLink = (linkData as any)?.properties?.action_link as string | undefined

        return NextResponse.json(
          {
            invite: inviteRow,
            warning:
              'Invite saved, but Supabase would not send an invite email because this user already exists. Use the resend link below.',
            actionLink: !linkError ? actionLink ?? null : null,
          },
          { status: 200 },
        )
      }

      return NextResponse.json({ invite: inviteRow, warning: `Invite saved but email failed to send: ${msg}` }, { status: 200 })
    }

    return NextResponse.json({ invite: inviteRow }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Internal server error' }, { status: 500 })
  }
}


import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const admin = createAdminClient()

  const token = String(params.token ?? '').trim()
  if (!token) return NextResponse.json({ error: 'Invalid invitation token' }, { status: 400 })

  // Fetch the invite row first (avoid nested selects which can fail if relationships
  // aren't introspected the way we expect).
  const { data: invite, error: inviteError } = await admin
    .from('team_invitations')
    .select('email,status,expires_at,organization_id,inviter_id')
    .eq('token', token)
    .limit(1)
    .maybeSingle()

  if (inviteError) {
    console.error('Error fetching invitation:', inviteError)
    return NextResponse.json({ error: 'Failed to verify invitation' }, { status: 500 })
  }

  if (!invite) {
    return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 })
  }

  const expiresAt = invite.expires_at ? new Date(invite.expires_at as any) : null
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })
  }

  if (invite.status === 'accepted') {
    return NextResponse.json({ error: 'Invitation has already been accepted' }, { status: 409 })
  }
  if (invite.status === 'expired') {
    return NextResponse.json({ error: 'Invitation has been revoked or expired' }, { status: 410 })
  }
  if (invite.status !== 'pending') {
    return NextResponse.json({ error: 'Invalid invitation status' }, { status: 400 })
  }

  const [{ data: org }, { data: inviterProfile }] = await Promise.all([
    admin.from('organizations').select('name').eq('id', invite.organization_id).maybeSingle(),
    invite.inviter_id
      ? admin.from('profiles').select('full_name').eq('id', invite.inviter_id).maybeSingle()
      : Promise.resolve({ data: null } as any),
  ])

  return NextResponse.json(
    {
      email: invite.email,
      organizationName: org?.name ?? 'Organization',
      inviterName: inviterProfile?.full_name ?? 'A teammate',
    },
    { status: 200 },
  )
}

export async function POST(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const supabase = createClient()
  const admin = createAdminClient()

  const token = String(params.token ?? '').trim()
  if (!token) return NextResponse.json({ error: 'Invalid invitation token' }, { status: 400 })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Accept via SECURITY DEFINER function (handles status update + membership insert).
  const { data: result, error } = await admin.rpc('accept_team_invitation', {
    invitation_token: token,
    user_id: user.id,
  } as any)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const success = Boolean((result as any)?.success)
  if (!success) {
    return NextResponse.json({ error: (result as any)?.message ?? 'Invalid or expired invitation' }, { status: 400 })
  }

  return NextResponse.json({ success: true, organizationId: (result as any)?.organization_id ?? null }, { status: 200 })
}


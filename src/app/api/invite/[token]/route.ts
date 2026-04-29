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

  const { data, error } = await admin
    .from('team_invitations')
    .select(
      `
      email,
      status,
      expires_at,
      organizations:organization_id ( name ),
      profiles:inviter_id ( full_name )
    `,
    )
    .eq('token', token)
    .limit(1)
    .maybeSingle()

  if (error || !data || data.status !== 'pending') {
    return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 })
  }

  const expiresAt = data.expires_at ? new Date(data.expires_at as any) : null
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 })
  }

  const org = (data.organizations as any)?.[0]
  const inviter = (data.profiles as any)?.[0]

  return NextResponse.json(
    {
      email: data.email,
      organizationName: org?.name ?? 'Organization',
      inviterName: inviter?.full_name ?? 'A teammate',
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


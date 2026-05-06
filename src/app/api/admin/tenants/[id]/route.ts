import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/guards'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { hasAccess } = await requireSuperAdmin()
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Use service-role client to bypass RLS for super-admin management.
    const supabase = createAdminClient()
    const { data: organization, error } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        slug,
        owner_id,
        created_at,
        updated_at,
        organization_members(
          id,
          user_id,
          system_role,
          custom_roles,
          joined_at
        ),
        projects(
          id,
          name,
          description,
          status,
          progress_percent,
          created_at
        )
      `)
      .eq('id', params.id)
      .single()

    if (error || !organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const ownerId = organization.owner_id as string | null
    const memberUserIds = Array.from(
      new Set((organization.organization_members ?? []).map((m: { user_id: string | null }) => m.user_id).filter(Boolean))
    ) as string[]

    const [ownerProfileRes, ownerUserRes, memberProfilesRes, memberUsers] = await Promise.all([
      ownerId
        ? supabase.from('profiles').select('id, full_name, avatar_url, role').eq('id', ownerId).single()
        : Promise.resolve({ data: null }),
      ownerId ? supabase.auth.admin.getUserById(ownerId) : Promise.resolve({ data: { user: null } }),
      memberUserIds.length
        ? supabase.from('profiles').select('id, full_name, avatar_url').in('id', memberUserIds)
        : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; avatar_url: string | null }> }),
      Promise.all(
        memberUserIds.map(async (id) => {
          const { data } = await supabase.auth.admin.getUserById(id)
          return [id, data?.user?.email ?? null] as const
        })
      ),
    ])

    const memberProfileById = new Map((memberProfilesRes.data ?? []).map((p) => [p.id, p]))
    const memberEmailById = new Map(memberUsers)

    return NextResponse.json({
      organization: {
        ...organization,
        owner: {
          id: ownerId ?? '',
          full_name: ownerProfileRes.data?.full_name ?? null,
          email: ownerUserRes.data?.user?.email ?? 'Unknown',
          avatar_url: ownerProfileRes.data?.avatar_url ?? null,
          role: ownerProfileRes.data?.role ?? null,
        },
        organization_members: (organization.organization_members ?? []).map((m: { user_id: string }) => {
          const profile = memberProfileById.get(m.user_id)
          return {
            ...m,
            profile: {
              full_name: profile?.full_name ?? null,
              email: memberEmailById.get(m.user_id) ?? 'Unknown',
              avatar_url: profile?.avatar_url ?? null,
            },
          }
        }),
      },
    })
  } catch (error) {
    console.error('Error fetching tenant:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { hasAccess } = await requireSuperAdmin()
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const supabase = createAdminClient()

    const { data: organization, error } = await supabase
      .from('organizations')
      .update({
        name: body.name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ organization })
  } catch (error) {
    console.error('Error updating tenant:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { hasAccess } = await requireSuperAdmin()
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tenant:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

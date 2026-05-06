import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/guards'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Check if user is super admin
    const { hasAccess } = await requireSuperAdmin()
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Use service-role client to bypass RLS for super-admin management.
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''

    const from = (page - 1) * limit
    const to = from + limit - 1

    // Build query
    let query = supabase
      .from('organizations')
      .select(`
        id,
        name,
        slug,
        owner_id,
        created_at,
        updated_at,
        organization_members(count),
        projects(count)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    // Add search filter
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data: organizationsRaw, error, count } = await query.range(from, to)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const organizations = organizationsRaw ?? []
    const ownerIds = Array.from(
      new Set(organizations.map((o) => o.owner_id).filter(Boolean))
    ) as string[]

    const [{ data: ownerProfiles }, ownerEmails] = await Promise.all([
      ownerIds.length
        ? supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', ownerIds)
        : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; avatar_url: string | null }> }),
      Promise.all(
        ownerIds.map(async (id) => {
          const { data } = await supabase.auth.admin.getUserById(id)
          return [id, data?.user?.email ?? null] as const
        })
      ),
    ])

    const ownerProfileById = new Map((ownerProfiles ?? []).map((p) => [p.id, p]))
    const ownerEmailById = new Map(ownerEmails)

    return NextResponse.json({
      organizations: organizations.map((o) => {
        const ownerProfile = o.owner_id ? ownerProfileById.get(o.owner_id) : null
        const ownerEmail = o.owner_id ? ownerEmailById.get(o.owner_id) : null

        return {
          id: o.id,
          name: o.name,
          slug: o.slug,
          created_at: o.created_at,
          updated_at: o.updated_at,
          owner: {
            id: o.owner_id ?? '',
            full_name: ownerProfile?.full_name ?? null,
            email: ownerEmail ?? 'Unknown',
            avatar_url: ownerProfile?.avatar_url ?? null,
          },
          organization_members: o.organization_members,
          projects: o.projects,
        }
      }),
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching tenants:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

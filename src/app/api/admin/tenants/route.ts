import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/guards'

export async function GET(request: Request) {
  try {
    // Check if user is super admin
    const { hasAccess } = await requireSuperAdmin()
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'

    const from = (page - 1) * limit
    const to = from + limit - 1

    // Build query
    let query = supabase
      .from('organizations')
      .select(`
        id,
        name,
        created_at,
        updated_at,
        owner:profiles!organizations_owner_id_fkey(
          id,
          full_name,
          email,
          avatar_url
        ),
        organization_members(count),
        projects(count)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    // Add search filter
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data: organizations, error, count } = await query.range(from, to)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      organizations,
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

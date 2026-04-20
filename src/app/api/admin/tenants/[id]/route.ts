import { createClient } from '@/lib/supabase/server'
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

    const supabase = createClient()
    const { data: organization, error } = await supabase
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
          avatar_url,
          role
        ),
        organization_members(
          id,
          user_id,
          role,
          joined_at,
          profile:profiles!organization_members_user_id_fkey(
            full_name,
            email,
            avatar_url
          )
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

    return NextResponse.json({ organization })
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
    const supabase = createClient()

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

    const supabase = createClient()
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

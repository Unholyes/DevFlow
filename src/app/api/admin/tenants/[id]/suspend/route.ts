import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/guards'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { hasAccess } = await requireSuperAdmin()
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = createClient()

    // Get organization owner to suspend their auth
    const { data: organization } = await supabase
      .from('organizations')
      .select('owner_id')
      .eq('id', params.id)
      .single()

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Suspend the owner's auth account
    const { error: authError } = await supabase.auth.admin.updateUserById(
      organization.owner_id,
      { user_metadata: { suspended: true } }
    )

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // Update organization metadata
    const { error: orgError } = await supabase
      .from('organizations')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (orgError) {
      return NextResponse.json({ error: orgError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Tenant suspended successfully' })
  } catch (error) {
    console.error('Error suspending tenant:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

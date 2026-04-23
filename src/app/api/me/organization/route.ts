import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createClient()
    const admin = createAdminClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Owner org first
    const { data: ownedOrgs, error: ownedError } = await admin
      .from('organizations')
      .select('id,name')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (ownedError) {
      console.error('Error fetching owned org:', ownedError)
      return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 })
    }

    if (ownedOrgs && ownedOrgs.length > 0) {
      return NextResponse.json({ name: ownedOrgs[0]?.name ?? null })
    }

    // Membership org (pick the first)
    const { data: memberships, error: membershipError } = await admin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })
      .limit(1)

    if (membershipError) {
      console.error('Error fetching org membership:', membershipError)
      return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 })
    }

    const orgId = memberships?.[0]?.organization_id
    if (!orgId) {
      return NextResponse.json({ name: null })
    }

    const { data: org, error: orgError } = await admin
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()

    if (orgError) {
      console.error('Error fetching org by id:', orgError)
      return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 })
    }

    return NextResponse.json({ name: org?.name ?? null })
  } catch (error) {
    console.error('Error in /api/me/organization:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')?.trim()

    if (!name || name.length < 2) {
      return NextResponse.json({ exists: false })
    }

    const adminSupabase = createAdminClient()

    // 1. Check if organization name exists in public.organizations
    const { data: existingOrg, error: orgError } = await adminSupabase
      .from('organizations')
      .select('name')
      .ilike('name', name)
      .maybeSingle()

    if (orgError) {
      console.error('Error querying organizations:', orgError)
      return NextResponse.json({ error: 'Failed to verify organization name' }, { status: 500 })
    }

    if (existingOrg) {
      return NextResponse.json({
        exists: true,
        type: 'organization',
        name: existingOrg.name,
      })
    }

    // 2. Check if organization name exists in public.organization_applications with pending/approved status
    const { data: existingApp, error: appError } = await adminSupabase
      .from('organization_applications')
      .select('organization_name')
      .ilike('organization_name', name)
      .in('status', ['pending', 'approved'])
      .maybeSingle()

    if (appError) {
      console.error('Error querying organization applications:', appError)
      return NextResponse.json({ error: 'Failed to verify organization applications' }, { status: 500 })
    }

    if (existingApp) {
      return NextResponse.json({
        exists: true,
        type: 'application',
        name: existingApp.organization_name,
      })
    }

    return NextResponse.json({ exists: false })
  } catch (error) {
    console.error('Error in check-name API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

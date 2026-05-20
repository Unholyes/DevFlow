import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      organizationName,
      description,
      contactEmail,
      phoneNumber,
      websiteUrl,
      industry,
      expectedTeamSize,
      useCase,
    } = body

    // Validate required fields
    if (!organizationName || !description || !contactEmail || !useCase) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()
    const trimmedOrgName = organizationName.trim()

    // 1. Check if organization name exists in public.organizations
    const { data: existingOrg, error: orgError } = await adminSupabase
      .from('organizations')
      .select('name')
      .ilike('name', trimmedOrgName)
      .maybeSingle()

    if (orgError) {
      console.error('Error querying organizations:', orgError)
      return NextResponse.json({ error: 'Failed to verify organization name' }, { status: 500 })
    }

    if (existingOrg) {
      return NextResponse.json(
        { error: `An organization named "${existingOrg.name}" already exists.` },
        { status: 409 }
      )
    }

    // 2. Check if organization name exists in public.organization_applications with pending/approved status
    const { data: existingApp, error: appError } = await adminSupabase
      .from('organization_applications')
      .select('organization_name')
      .ilike('organization_name', trimmedOrgName)
      .in('status', ['pending', 'approved'])
      .maybeSingle()

    if (appError) {
      console.error('Error querying organization applications:', appError)
      return NextResponse.json({ error: 'Failed to verify organization applications' }, { status: 500 })
    }

    if (existingApp) {
      return NextResponse.json(
        { error: `An organization application for "${existingApp.organization_name}" already exists or is under review.` },
        { status: 409 }
      )
    }

    // Check if user already has a pending or approved application
    const { data: existingApplication } = await supabase
      .from('organization_applications')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'approved'])
      .single()

    if (existingApplication) {
      return NextResponse.json(
        { error: 'You already have a pending or approved application' },
        { status: 400 }
      )
    }

    // Create the organization application
    const { data: application, error } = await supabase
      .from('organization_applications')
      .insert({
        user_id: user.id,
        organization_name: organizationName,
        description,
        contact_email: contactEmail,
        phone_number: phoneNumber || null,
        website_url: websiteUrl || null,
        industry: industry || null,
        expected_team_size: expectedTeamSize || null,
        use_case: useCase,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating organization application:', error)
      return NextResponse.json({ error: 'Failed to create application' }, { status: 500 })
    }

    return NextResponse.json({ application }, { status: 201 })
  } catch (error) {
    console.error('Error in organization applications API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const admin = searchParams.get('admin') === '1'

    // Check if user is super admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'super_admin') {
      if (admin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      // Regular users can only see their own applications
      const { data: applications } = await supabase
        .from('organization_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false })

      return NextResponse.json({ applications })
    }

    // Super admins can see all applications
    const status = searchParams.get('status')

    let query = supabase
      .from('organization_applications')
      .select('*')
      .order('submitted_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: applications, error: applicationsError } = await query

    if (applicationsError) {
      console.error('Error fetching applications (super admin):', applicationsError)
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
    }

    return NextResponse.json({ applications })
  } catch (error) {
    console.error('Error fetching organization applications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

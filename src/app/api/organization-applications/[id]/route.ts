import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is super admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action, revision_notes } = body

    if (!['approve', 'decline', 'revision'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Get the application
    const { data: application } = await supabase
      .from('organization_applications')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (application.status !== 'pending') {
      return NextResponse.json({ error: 'Application has already been processed' }, { status: 400 })
    }

    // Update the application status
    const updateData: any = {
      status: action === 'revision' ? 'revision_requested' : action,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    }

    if (action === 'revision' && revision_notes) {
      updateData.revision_notes = revision_notes
    }

    const { error: updateError } = await supabase
      .from('organization_applications')
      .update(updateData)
      .eq('id', params.id)

    if (updateError) {
      console.error('Error updating application:', updateError)
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
    }

    // If approved, create the organization and update user role
    if (action === 'approve') {
      // Create the organization
      const { error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: application.organization_name,
          owner_id: application.user_id,
        })

      if (orgError) {
        console.error('Error creating organization:', orgError)
        // Rollback the application status
        await supabase
          .from('organization_applications')
          .update({ status: 'pending' })
          .eq('id', params.id)
        return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
      }

      // Update user role to tenant_admin
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: 'tenant_admin' })
        .eq('id', application.user_id)

      if (roleError) {
        console.error('Error updating user role:', roleError)
      }

      // TODO: Send email notification to user about approval
      // This would require setting up Supabase Auth emails or a third-party email service
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in application action API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

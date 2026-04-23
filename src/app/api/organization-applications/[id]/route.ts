import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const admin = createAdminClient()
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
    const { data: application, error: applicationError } = await admin
      .from('organization_applications')
      .select('*')
      .eq('id', params.id)
      .single()

    if (applicationError) {
      console.error('Error fetching application:', applicationError)
      return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 })
    }

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (application.status !== 'pending') {
      return NextResponse.json({ error: 'Application has already been processed' }, { status: 400 })
    }

    const nextStatus =
      action === 'approve'
        ? 'approved'
        : action === 'decline'
        ? 'declined'
        : 'revision_requested'

    // Update the application status
    const updateData: any = {
      status: nextStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    }

    if (action === 'revision' && revision_notes) {
      updateData.revision_notes = revision_notes
    }

    const { error: updateError } = await admin
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
      const { data: organization, error: orgError } = await admin
        .from('organizations')
        .insert({
          name: application.organization_name,
          owner_id: application.user_id,
        })
        .select()
        .single()

      if (orgError) {
        console.error('Error creating organization:', orgError)
        // Rollback the application status
        await admin
          .from('organization_applications')
          .update({ status: 'pending' })
          .eq('id', params.id)
        return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
      }

      // Ensure the owner is also a member/admin of the org (RBAC in app uses this table)
      if (organization?.id) {
        const { error: memberError } = await admin
          .from('organization_members')
          .insert({
            organization_id: organization.id,
            user_id: application.user_id,
            role: 'admin',
          })

        if (memberError) {
          console.error('Error creating owner membership:', memberError)
        }
      }

      // Update user role to tenant_admin
      const { error: roleError } = await admin
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

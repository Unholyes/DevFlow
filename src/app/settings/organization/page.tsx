import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { updateOrganization } from '@/lib/actions/settings'
import { OrganizationForm } from '@/components/settings/organization-form'

export default async function OrganizationPage() {
  const supabase = createClient()
  const admin = createAdminClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect('/auth/login')
  }

  // Get user profile to verify they are a tenant admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'tenant_admin') {
    redirect('/settings')
  }

  // Get user's organization (owner first, otherwise membership)
  let organizationId: string | null = null

  const { data: ownedOrg } = await admin
    .from('organizations')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (ownedOrg?.id) {
    organizationId = ownedOrg.id
  } else {
    const { data: membership } = await admin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    organizationId = membership?.organization_id ?? null
  }

  const { data: organization } = organizationId
    ? await admin.from('organizations').select('*').eq('id', organizationId).single()
    : { data: null }

  // Get owner profile (display info) - uses the org owner_id when available
  const ownerId = organization?.owner_id ?? user.id
  const { data: ownerProfile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', ownerId)
    .single()

  // Get organization members
  const { data: members } = await admin
    .from('organization_members')
    .select(`
      *,
      profiles:user_id (
        full_name,
        avatar_url
      )
    `)
    .eq('organization_id', organizationId ?? '')

  if (!organization) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Organization Not Found</h1>
          <p className="text-gray-600">Unable to find your organization. Please contact support.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Organization Settings</h1>
        <p className="text-gray-600 mt-2">Manage your organization settings and team members.</p>
      </div>

      <div className="space-y-8">
        {/* Organization Overview */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500">Organization</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{organization.name}</p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500">Owner</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{ownerProfile?.full_name || 'You'}</p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500">Members</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{members?.length ?? 0}</p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500">Created</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {organization.created_at ? new Date(organization.created_at).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 sm:col-span-2">
              <p className="text-xs font-medium text-gray-500">Organization ID</p>
              <p className="mt-1 text-sm font-mono text-gray-900 break-all">{organization.id}</p>
            </div>
          </div>
        </div>

        {/* Organization Settings */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Organization Details</h2>
          <OrganizationForm
            organization={organization}
            updateOrganization={updateOrganization}
          />
        </div>

        {/* Team Members */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Members</h2>
          <div className="mt-4">
            {members && members.length > 0 ? (
              <div className="space-y-3">
                {members.map((member: any) => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {member.profiles?.full_name
                            ? member.profiles.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                            : 'U'
                          }
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.profiles?.full_name || 'Unknown User'}
                        </p>
                        <p className="text-sm text-gray-600 capitalize">
                          {member.role} • Joined {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No team members found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
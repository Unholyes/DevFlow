import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { updateOrganization } from '@/lib/actions/settings'
import { OrganizationForm } from '@/components/settings/organization-form'

export default async function OrganizationPage() {
  const supabase = createClient()

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

  // Get user's organization
  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  // Get organization members
  const { data: members } = await supabase
    .from('organization_members')
    .select(`
      *,
      profiles:user_id (
        full_name,
        avatar_url
      )
    `)
    .eq('organization_id', organization?.id)

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
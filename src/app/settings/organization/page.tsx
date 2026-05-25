import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { updateOrganization } from '@/lib/actions/settings'
import { OrganizationForm } from '@/components/settings/organization-form'
import { resolveWorkspaceContext } from '@/lib/auth/resolve-workspace-role'
import {
  settingsCard,
  settingsMemberRow,
  settingsPageSubtitle,
  settingsPageTitle,
  settingsSectionTitle,
  settingsStatBox,
  settingsStatLabel,
  settingsStatValue,
} from '@/lib/theme/settings-surface-classes'

export default async function OrganizationPage() {
  const supabase = createClient()
  const admin = createAdminClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect('/auth/login')
  }

  const ws = await resolveWorkspaceContext({ supabase: supabase as any, userId: user.id })
  if (ws.role !== 'tenant_admin') {
    redirect('/settings')
  }

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

  const ownerId = organization?.owner_id ?? user.id
  const { data: ownerProfile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', ownerId)
    .single()

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
      <div className="max-w-2xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Organization Not Found</h1>
        <p className="text-muted-foreground">Unable to find your organization. Please contact support.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className={settingsPageTitle}>Organization Settings</h1>
        <p className={settingsPageSubtitle}>Manage your organization settings and team members.</p>
      </div>

      <div className="space-y-8">
        <div className={settingsCard}>
          <h2 className={settingsSectionTitle}>Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={settingsStatBox}>
              <p className={settingsStatLabel}>Organization</p>
              <p className={settingsStatValue}>{organization.name}</p>
            </div>
            <div className={settingsStatBox}>
              <p className={settingsStatLabel}>Owner</p>
              <p className={settingsStatValue}>{ownerProfile?.full_name || 'You'}</p>
            </div>
            <div className={settingsStatBox}>
              <p className={settingsStatLabel}>Members</p>
              <p className={settingsStatValue}>{members?.length ?? 0}</p>
            </div>
            <div className={settingsStatBox}>
              <p className={settingsStatLabel}>Created</p>
              <p className={settingsStatValue}>
                {organization.created_at ? new Date(organization.created_at).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
            <div className={`${settingsStatBox} sm:col-span-2`}>
              <p className={settingsStatLabel}>Organization ID</p>
              <p className={`${settingsStatValue} font-mono break-all`}>{organization.id}</p>
            </div>
          </div>
        </div>

        <div className={settingsCard}>
          <h2 className={settingsSectionTitle}>Organization Details</h2>
          <OrganizationForm organization={organization} updateOrganization={updateOrganization} />
        </div>

        <div className={settingsCard}>
          <h2 className={settingsSectionTitle}>Team Members</h2>
          <div className="mt-4">
            {members && members.length > 0 ? (
              <div className="space-y-3">
                {members.map((member: { id: string; role: string; joined_at: string; profiles?: { full_name?: string } }) => (
                  <div key={member.id} className={settingsMemberRow}>
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'var(--theme-primary)' }}
                      >
                        <span className="text-primary-foreground font-medium text-sm">
                          {member.profiles?.full_name
                            ? member.profiles.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                            : 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {member.profiles?.full_name || 'Unknown User'}
                        </p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {member.role} • Joined {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No team members found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

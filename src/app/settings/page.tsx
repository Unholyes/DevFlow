import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { User, Building, Settings as SettingsIcon, Shield } from 'lucide-react'
import { resolveWorkspaceContext } from '@/lib/auth/resolve-workspace-role'
import {
  settingsCard,
  settingsPageSubtitle,
  settingsPageTitle,
  settingsSectionHeading,
  settingsSectionTitle,
} from '@/lib/theme/settings-surface-classes'

export default async function SettingsPage() {
  const supabase = createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    redirect('/auth/login')
  }

  // Get user profile to determine role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'super_admin') {
    redirect('/super-admin/dashboard')
  }

  const ws = await resolveWorkspaceContext({ supabase: supabase as any, userId: user.id })
  const isTenantAdmin = ws.role === 'tenant_admin'

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className={settingsPageTitle}>Settings</h1>
        <p className={settingsPageSubtitle}>Manage your account and organization settings</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Settings */}
        <div className={settingsCard}>
          <div className="flex items-center mb-4">
            <User className="h-6 w-6 text-primary mr-3" />
            <h2 className={settingsSectionHeading}>Profile</h2>
          </div>
          <p className="text-muted-foreground mb-4">
            Update your personal information and profile picture.
          </p>
          <Link
            href="/settings/profile"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <SettingsIcon className="h-4 w-4 mr-2" />
            Manage Profile
          </Link>
        </div>

        {/* Organization Settings - Only for tenant admins */}
        {isTenantAdmin && (
          <>
            <div className={settingsCard}>
              <div className="flex items-center mb-4">
                <Building className="h-6 w-6 text-[var(--theme-accent)] mr-3" />
                <h2 className={settingsSectionHeading}>Organization</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                Manage your organization settings and team members.
              </p>
              <Link
                href="/settings/organization"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <SettingsIcon className="h-4 w-4 mr-2" />
                Manage Organization
              </Link>
            </div>

            <div className={settingsCard}>
              <div className="flex items-center mb-4">
                <Shield className="h-6 w-6 text-primary mr-3" />
                <h2 className={settingsSectionHeading}>Permissions</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                Define account-level permissions for default and custom roles.
              </p>
              <Link
                href="/settings/permissions"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <SettingsIcon className="h-4 w-4 mr-2" />
                Manage Permissions
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Account Information */}
      <div className={`mt-8 ${settingsCard}`}>
        <h2 className={settingsSectionTitle}>Account Information</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email:</span>
            <span className="font-medium text-foreground">{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Role:</span>
            <span className="font-medium text-foreground capitalize">{ws.role.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Member since:</span>
            <span className="font-medium">{new Date(user.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
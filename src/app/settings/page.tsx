import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { User, Building, Settings as SettingsIcon } from 'lucide-react'

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

  const isTenantAdmin = profile?.role === 'tenant_admin'

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account and organization settings</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Settings */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <User className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Profile</h2>
          </div>
          <p className="text-gray-600 mb-4">
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
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <Building className="h-6 w-6 text-green-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Organization</h2>
            </div>
            <p className="text-gray-600 mb-4">
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
        )}
      </div>

      {/* Account Information */}
      <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Email:</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Role:</span>
            <span className="font-medium capitalize">{profile?.role?.replace('_', ' ') || 'Team Member'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Member since:</span>
            <span className="font-medium">{new Date(user.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
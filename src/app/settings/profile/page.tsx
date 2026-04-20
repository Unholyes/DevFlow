import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { updateProfile } from '@/lib/actions/settings'
import { ProfileForm } from '@/components/settings/profile-form'

export default async function ProfilePage() {
  const supabase = createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect('/auth/login')
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('Error fetching profile:', profileError)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600 mt-2">Update your personal information and profile picture.</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <ProfileForm
          user={user}
          profile={profile}
          updateProfile={updateProfile}
        />
      </div>
    </div>
  )
}
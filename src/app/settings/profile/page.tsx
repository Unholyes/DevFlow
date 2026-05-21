import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { updateProfile } from '@/lib/actions/settings'
import { ProfileForm } from '@/components/settings/profile-form'
import { settingsCard, settingsPageSubtitle, settingsPageTitle } from '@/lib/theme/settings-surface-classes'

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
        <h1 className={settingsPageTitle}>Profile Settings</h1>
        <p className={settingsPageSubtitle}>Update your personal information and profile picture.</p>
      </div>

      <div className={settingsCard}>
        <ProfileForm
          user={user}
          profile={profile}
          updateProfile={updateProfile}
        />
      </div>
    </div>
  )
}
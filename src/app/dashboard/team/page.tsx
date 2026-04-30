import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { TeamPageContent } from '@/components/dashboard/team-page-content'

export const metadata: Metadata = {
  title: 'Team | DevFlow',
  description:
    'View workspace members, project assignments, and pending invitations for your DevFlow organization.',
}

export default async function TeamPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'team_member'

  return <TeamPageContent role={role} />
}

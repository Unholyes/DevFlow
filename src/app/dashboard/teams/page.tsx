import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveWorkspaceContext } from '@/lib/auth/resolve-workspace-role'
import { TeamsPageContent } from '@/components/teams/teams-page-content'

export const metadata: Metadata = {
  title: 'Teams | DevFlow',
  description: 'Manage teams in your workspace.',
}

export default async function TeamsPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const ws = await resolveWorkspaceContext({ supabase: supabase as any, userId: user.id })
  if (!ws.organizationId) redirect('/dashboard')

  const { data: teams } = await supabase
    .from('teams')
    .select('id,organization_id,name,description,created_at')
    .eq('organization_id', ws.organizationId)
    .order('created_at', { ascending: true })

  return <TeamsPageContent organizationId={ws.organizationId} currentUserId={user.id} initialTeams={(teams ?? []) as any} />
}


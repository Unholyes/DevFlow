import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveWorkspaceContext } from '@/lib/auth/resolve-workspace-role'
import { TeamDetailPageContent } from '@/components/teams/team-detail-page-content'

export const metadata: Metadata = {
  title: 'Team | DevFlow',
  description: 'Team details and membership.',
}

export default async function TeamDetailPage(context: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await context.params
  if (!teamId) redirect('/dashboard/teams')

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const ws = await resolveWorkspaceContext({ supabase: supabase as any, userId: user.id })
  if (!ws.organizationId) redirect('/dashboard')

  const { data: team } = await supabase
    .from('teams')
    .select('id,organization_id,name,description,created_at,created_by')
    .eq('id', teamId)
    .maybeSingle()

  if (!team?.id || team.organization_id !== ws.organizationId) {
    redirect('/dashboard/teams')
  }

  return <TeamDetailPageContent organizationId={ws.organizationId} team={team as any} currentUserId={user.id} />
}


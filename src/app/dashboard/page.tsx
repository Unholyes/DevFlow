import { createClient } from '@/lib/supabase/server'
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached'
import { TenantAdminDashboardHome } from '@/components/dashboard/tenant-admin-dashboard-home'
import { TeamMemberDashboard } from '@/components/dashboard/team-member-dashboard'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import { loadMemberDashboardData } from '@/lib/dashboard/load-team-member-dashboard'
import { redirect } from 'next/navigation'
import { resolveWorkspaceContext } from '@/lib/auth/resolve-workspace-role'

export default async function Dashboard() {
  const supabase = createClient()
  const tenantSlug = getTenantSlug()

  // Use cached user + profile (shared with layout — zero extra DB calls)
  const { user } = await getCachedUser()

  if (!user) {
    return null
  }

  const orgId = tenantSlug
    ? (
        await supabase
          .from('organizations')
          .select('id')
          .eq('slug', tenantSlug)
          .maybeSingle()
      ).data?.id ?? null
    : await resolvePrimaryOrgIdForUser(supabase as any, user.id)

  if (!orgId) redirect('/onboarding')

  const profile = await getCachedProfile(user.id)

  const ws = await resolveWorkspaceContext({ supabase: supabase as any, userId: user.id })
  const displayName =
    profile?.full_name?.trim() || user.email?.split('@')[0] || 'there'

  if (ws.role === 'tenant_admin') {
    const [
      activeProjectsRes,
      membersRes,
      orgRes,
      pendingInvitesRes,
    ] = await Promise.all([
      supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'active'),
      supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId),
      supabase.from('organizations').select('owner_id').eq('id', orgId).maybeSingle(),
      supabase
        .from('team_invitations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'pending'),
    ])

    const ownerId = orgRes.data?.owner_id ?? null
    const membersCount = membersRes.count ?? 0

    let totalMembers = membersCount
    if (ownerId) {
      const { count: ownerMembershipCount } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('user_id', ownerId)

      if ((ownerMembershipCount ?? 0) === 0) totalMembers += 1
    }

    return (
      <TenantAdminDashboardHome
        stats={{
          activeProjects: activeProjectsRes.count ?? 0,
          totalMembers,
          pendingInvites: pendingInvitesRes.count ?? 0,
        }}
      />
    )
  }

  const { projects, myTasks, activities, sprintHint } = await loadMemberDashboardData(
    supabase,
    orgId,
    user.id
  )

  return (
    <TeamMemberDashboard
      displayName={displayName}
      projects={projects}
      myTasks={myTasks}
      activities={activities}
      sprintHint={sprintHint}
    />
  )
}
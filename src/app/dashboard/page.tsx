import { createClient } from '@/lib/supabase/server'
import { TenantAdminDashboardHome } from '@/components/dashboard/tenant-admin-dashboard-home'
import { TeamMemberDashboard } from '@/components/dashboard/team-member-dashboard'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import { loadMemberDashboardData } from '@/lib/dashboard/load-team-member-dashboard'
import { redirect } from 'next/navigation'

export default async function Dashboard() {
  const supabase = createClient()
  const tenantSlug = getTenantSlug()

  const {
    data: { user },
  } = await supabase.auth.getUser()

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'team_member'
  const displayName =
    profile?.full_name?.trim() || user.email?.split('@')[0] || 'there'

  // Show tenant admin dashboard for tenant_admin role
  if (role === 'tenant_admin') {
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
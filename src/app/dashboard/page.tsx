import { createClient } from '@/lib/supabase/server'
import { TenantAdminDashboardHome } from '@/components/dashboard/tenant-admin-dashboard-home'
import { TeamMemberDashboard } from '@/components/dashboard/team-member-dashboard'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
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
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'team_member'

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

  // Show team member dashboard for team_member role
  const [projectsRes, tasksRes, completedTasksRes, activeSprintsRes, overdueTasksRes, membersRes, orgRes] =
    await Promise.all([
      supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
      supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .not('completed_at', 'is', null),
      supabase
        .from('sprints')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'active'),
      supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .is('completed_at', null)
        .lt('due_date', new Date().toISOString().slice(0, 10)),
      supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId),
      supabase.from('organizations').select('owner_id').eq('id', orgId).maybeSingle(),
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
    <TeamMemberDashboard
      userId={user.id}
      stats={{
        totalProjects: projectsRes.count ?? 0,
        totalTasks: tasksRes.count ?? 0,
        completedTasks: completedTasksRes.count ?? 0,
        activeSprints: activeSprintsRes.count ?? 0,
        overdueTasks: overdueTasksRes.count ?? 0,
        teamMembers: totalMembers,
      }}
    />
  )
}
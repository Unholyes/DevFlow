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

  // Show team member dashboard (same accounts-style tabs / lists as AccountsPageContent)
  const [{ data: ownedOrgs }, { data: memberships }] = await Promise.all([
    supabase
      .from('organizations')
      .select('id,slug,name,created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('organization_members')
      .select('organization_id,organizations:organization_id ( id,slug,name,created_at )')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false }),
  ])

  const orgById = new Map<string, { id: string; slug: string; name: string; created_at: string }>()
  for (const o of (ownedOrgs ?? []) as Array<{ id: string; slug: string; name: string; created_at: string }>) {
    if (o?.id) orgById.set(o.id, o)
  }
  for (const m of (memberships ?? []) as Array<{ organizations?: { id: string; slug: string; name: string; created_at: string } | null }>) {
    const o = m?.organizations
    if (o?.id) orgById.set(o.id, o)
  }
  const accessibleOrgs = Array.from(orgById.values()).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))

  const organizations = tenantSlug ? accessibleOrgs.filter((o) => o.id === orgId) : accessibleOrgs

  return (
    <TeamMemberDashboard organizationId={orgId} currentUserId={user.id} organizations={organizations} />
  )
}
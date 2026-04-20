import { createClient } from '@/lib/supabase/server'
import { TenantAdminDashboardHome } from '@/components/dashboard/tenant-admin-dashboard-home'
import { TeamMemberDashboard } from '@/components/dashboard/team-member-dashboard'

export default async function Dashboard() {
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

  // Show tenant admin dashboard for tenant_admin role
  if (role === 'tenant_admin') {
    return <TenantAdminDashboardHome />
  }

  // Show team member dashboard for team_member role
  return <TeamMemberDashboard userId={user.id} />
}
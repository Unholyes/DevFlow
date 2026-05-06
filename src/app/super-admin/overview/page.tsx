import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Building2, Users, FolderKanban, TrendingUp } from 'lucide-react'

export const dynamic = 'force-dynamic'

type TimeRange = '7d' | '30d' | '90d'

function getSinceDate(range: TimeRange) {
  const now = new Date()
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  now.setDate(now.getDate() - days)
  return now.toISOString()
}

async function getOverviewStats(range: TimeRange) {
  const supabase = createAdminClient()
  const since = getSinceDate(range)
  
  try {
    // Get total organizations
    const { count: orgCount } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })

    const [
      { count: userCount },
      { count: superAdminCount },
      { count: tenantAdminCount },
      { count: teamMemberCount },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'super_admin'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'tenant_admin'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'team_member'),
    ])

    // Get total projects
    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })

    const { count: newOrgCount } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since)

    const { count: newUserCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since)

    const { count: newProjectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since)

    return {
      totalOrganizations: orgCount || 0,
      totalUsers: userCount || 0,
      usersByRole: {
        super_admin: superAdminCount || 0,
        tenant_admin: tenantAdminCount || 0,
        team_member: teamMemberCount || 0,
      },
      totalProjects: projectCount || 0,
      newOrganizations: newOrgCount || 0,
      newUsers: newUserCount || 0,
      newProjects: newProjectCount || 0,
    }
  } catch (error) {
    console.error('Error fetching overview stats:', error)
    return {
      totalOrganizations: 0,
      totalUsers: 0,
      usersByRole: { super_admin: 0, tenant_admin: 0, team_member: 0 },
      totalProjects: 0,
      newOrganizations: 0,
      newUsers: 0,
      newProjects: 0,
    }
  }
}

async function getRecentActivity() {
  const supabase = createAdminClient()
  
  try {
    // Get recent organizations
    const { data: recentOrgs } = await supabase
      .from('organizations')
      // Keep this string single-line: Supabase's type-level parser is sensitive to whitespace/newlines.
      .select('id,name,slug,owner_id,created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    const ownerIds = Array.from(
      new Set((recentOrgs ?? []).map((o) => o.owner_id).filter(Boolean))
    ) as string[]

    const [{ data: ownerProfiles }, ownerEmails] = await Promise.all([
      ownerIds.length
        ? supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', ownerIds)
        : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null }> }),
      Promise.all(
        ownerIds.map(async (id) => {
          const { data } = await supabase.auth.admin.getUserById(id)
          return [id, data?.user?.email ?? null] as const
        })
      ),
    ])

    const ownerProfileById = new Map((ownerProfiles ?? []).map((p) => [p.id, p]))
    const ownerEmailById = new Map(ownerEmails)

    return {
      recentOrganizations: (recentOrgs ?? []).map((o) => {
        const ownerProfile = o.owner_id ? ownerProfileById.get(o.owner_id) : null
        const ownerEmail = o.owner_id ? ownerEmailById.get(o.owner_id) : null

        return {
          id: o.id,
          name: o.name,
          slug: o.slug,
          created_at: o.created_at,
          owner: {
            full_name: ownerProfile?.full_name ?? null,
            email: ownerEmail ?? null,
          },
        }
      }),
    }
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    return {
      recentOrganizations: [],
    }
  }
}

export default async function AdminOverview() {
  // Default to 30d for consistency with dashboard.
  const range: TimeRange = '30d'
  const stats = await getOverviewStats(range)
  const activity = await getRecentActivity()

  const metricCards = [
    {
      title: 'Total Organizations',
      value: stats.totalOrganizations,
      change: stats.newOrganizations,
      changeLabel: `new in ${range}`,
      icon: Building2,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      change: stats.newUsers,
      changeLabel: `new in ${range}`,
      icon: Users,
      color: 'bg-green-500',
    },
    {
      title: 'Total Projects',
      value: stats.totalProjects,
      change: stats.newProjects,
      changeLabel: `new in ${range}`,
      icon: FolderKanban,
      color: 'bg-purple-500',
    },
  ]

  const roleBreakdown = [
    { role: 'Super Admin', count: stats.usersByRole.super_admin || 0, color: 'bg-purple-500' },
    { role: 'Tenant Admin', count: stats.usersByRole.tenant_admin || 0, color: 'bg-blue-500' },
    { role: 'Team Member', count: stats.usersByRole.team_member || 0, color: 'bg-green-500' },
  ]

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Overview</h1>
            <p className="mt-2 text-gray-600">
              Platform-wide analytics and metrics
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/super-admin/overview?t=${Date.now()}`}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Refresh
            </Link>
            <Link
              href="/super-admin/tenants"
              className="rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              Manage tenants
            </Link>
          </div>
        </div>
        <p className="mt-2 text-gray-600">
          Totals plus growth for the last {range}.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metricCards.map((card) => (
          <div key={card.title} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-600">{card.title}</p>
              <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center`}>
                <card.icon className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-green-600 font-medium">{card.change}</span>
              <span className="text-gray-500 ml-2">{card.changeLabel}</span>
            </div>
          </div>
        ))}
      </div>

      {/* User Role Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Role Distribution</h3>
          <div className="space-y-4">
            {roleBreakdown.map((item) => (
              <div key={item.role}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{item.role}</span>
                  <span className="text-sm font-bold text-gray-900">{item.count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${item.color} h-2 rounded-full`}
                    style={{
                      width: stats.totalUsers > 0
                        ? `${(item.count / stats.totalUsers) * 100}%`
                        : '0%',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Growth</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">New Organizations ({range})</span>
                <span className="text-sm font-bold text-gray-900">{stats.newOrganizations}</span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">New Users ({range})</span>
                <span className="text-sm font-bold text-gray-900">{stats.newUsers}</span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">New Projects ({range})</span>
                <span className="text-sm font-bold text-gray-900">{stats.newProjects}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Organizations</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {activity.recentOrganizations.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No organizations yet
            </div>
          ) : (
            activity.recentOrganizations.map((org: any) => (
              <div key={org.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{org.name}</p>
                    <p className="text-xs text-gray-500">
                      {org.slug ? `${org.slug} • ` : ''}
                      Owner: {org.owner?.full_name || org.owner?.email || 'Unknown'} • {new Date(org.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

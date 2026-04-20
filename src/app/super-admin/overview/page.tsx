import { createClient } from '@/lib/supabase/server'
import { Building2, Users, FolderKanban, TrendingUp } from 'lucide-react'

async function getOverviewStats() {
  const supabase = createClient()
  
  try {
    // Get total organizations
    const { count: orgCount } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })

    // Get total users by role
    const { data: usersByRole } = await supabase
      .from('profiles')
      .select('role')

    const roleCounts = usersByRole?.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {} as Record<string, number>) || { super_admin: 0, tenant_admin: 0, team_member: 0 }

    // Get total projects
    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })

    // Get organizations created in last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count: newOrgCount } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())

    // Get users created in last 30 days
    const { count: newUserCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())

    return {
      totalOrganizations: orgCount || 0,
      totalUsers: usersByRole?.length || 0,
      usersByRole: roleCounts,
      totalProjects: projectCount || 0,
      newOrganizations: newOrgCount || 0,
      newUsers: newUserCount || 0,
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
    }
  }
}

async function getRecentActivity() {
  const supabase = createClient()
  
  try {
    // Get recent organizations
    const { data: recentOrgs } = await supabase
      .from('organizations')
      .select('id, name, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    return {
      recentOrganizations: recentOrgs || [],
    }
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    return {
      recentOrganizations: [],
    }
  }
}

export default async function AdminOverview() {
  const stats = await getOverviewStats()
  const activity = await getRecentActivity()

  const metricCards = [
    {
      title: 'Total Organizations',
      value: stats.totalOrganizations,
      change: stats.newOrganizations,
      changeLabel: 'new in 30 days',
      icon: Building2,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      change: stats.newUsers,
      changeLabel: 'new in 30 days',
      icon: Users,
      color: 'bg-green-500',
    },
    {
      title: 'Total Projects',
      value: stats.totalProjects,
      change: 0,
      changeLabel: 'across all tenants',
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
        <h1 className="text-3xl font-bold text-gray-900">Overview</h1>
        <p className="mt-2 text-gray-600">
          Platform-wide analytics and metrics
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
                <span className="text-sm font-medium text-gray-700">New Organizations (30 days)</span>
                <span className="text-sm font-bold text-gray-900">{stats.newOrganizations}</span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">New Users (30 days)</span>
                <span className="text-sm font-bold text-gray-900">{stats.newUsers}</span>
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
                    <p className="text-xs text-gray-500">{new Date(org.created_at).toLocaleDateString()}</p>
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

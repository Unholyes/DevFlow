import { createClient } from '@/lib/supabase/server'
import { Building2, Users, FolderKanban, CheckSquare, TrendingUp, Clock } from 'lucide-react'

async function getPlatformStats() {
  const supabase = createClient()
  
  try {
    // Get total organizations
    const { count: orgCount } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })

    // Get total users
    const { count: userCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    // Get total projects
    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })

    // Get total tasks
    const { count: taskCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })

    // Get completed tasks
    const { count: completedTaskCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .not('completed_at', 'is', null)

    // Get active sprints
    const { count: sprintCount } = await supabase
      .from('sprints')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    return {
      totalOrganizations: orgCount || 0,
      totalUsers: userCount || 0,
      totalProjects: projectCount || 0,
      totalTasks: taskCount || 0,
      completedTasks: completedTaskCount || 0,
      activeSprints: sprintCount || 0,
    }
  } catch (error) {
    console.error('Error fetching platform stats:', error)
    return {
      totalOrganizations: 0,
      totalUsers: 0,
      totalProjects: 0,
      totalTasks: 0,
      completedTasks: 0,
      activeSprints: 0,
    }
  }
}

async function getRecentOrganizations() {
  const supabase = createClient()
  
  try {
    const { data } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        created_at,
        owner:profiles!organizations_owner_id_fkey(
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    return data || []
  } catch (error) {
    console.error('Error fetching recent organizations:', error)
    return []
  }
}

export default async function AdminDashboard() {
  const stats = await getPlatformStats()
  const recentOrganizations = await getRecentOrganizations()

  const statCards = [
    {
      title: 'Total Organizations',
      value: stats.totalOrganizations,
      icon: Building2,
      color: 'bg-blue-500',
      trend: '+12%',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-green-500',
      trend: '+8%',
    },
    {
      title: 'Total Projects',
      value: stats.totalProjects,
      icon: FolderKanban,
      color: 'bg-purple-500',
      trend: '+15%',
    },
    {
      title: 'Total Tasks',
      value: stats.totalTasks,
      icon: CheckSquare,
      color: 'bg-orange-500',
      trend: '+22%',
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back! Here's an overview of your platform.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <div key={card.title} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
              </div>
              <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-green-600 font-medium">{card.trend}</span>
              <span className="text-gray-500 ml-2">from last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Task Completion</h3>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <div className="flex items-end gap-4">
            <p className="text-4xl font-bold text-gray-900">{stats.completedTasks}</p>
            <p className="text-gray-500 mb-1">of {stats.totalTasks} tasks completed</p>
          </div>
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{
                width: stats.totalTasks > 0
                  ? `${(stats.completedTasks / stats.totalTasks) * 100}%`
                  : '0%',
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Active Sprints</h3>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="flex items-end gap-4">
            <p className="text-4xl font-bold text-gray-900">{stats.activeSprints}</p>
            <p className="text-gray-500 mb-1">active sprints across all projects</p>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Teams are actively working on their sprint goals
          </p>
        </div>
      </div>

      {/* Recent Organizations */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Organizations</h3>
          <p className="text-sm text-gray-500 mt-1">Newly registered tenant organizations</p>
        </div>
        <div className="divide-y divide-gray-200">
          {recentOrganizations.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No organizations registered yet
            </div>
          ) : (
            recentOrganizations.map((org: any) => (
              <div key={org.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{org.name}</p>
                    <p className="text-sm text-gray-500">
                      Owner: {org.owner?.full_name || org.owner?.email || 'Unknown'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    {new Date(org.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        {recentOrganizations.length > 0 && (
          <div className="p-4 border-t border-gray-200">
            <a
              href="/super-admin/tenants"
              className="text-sm font-medium text-purple-600 hover:text-purple-700"
            >
              View all organizations →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

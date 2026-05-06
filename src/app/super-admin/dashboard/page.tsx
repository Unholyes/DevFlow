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

async function getPlatformStats(range: TimeRange) {
  const supabase = createAdminClient()
  const since = getSinceDate(range)
  
  try {
    // Get total organizations
    const { count: orgCount } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })

    const { count: orgNewCount } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since)

    // Get total users
    const { count: userCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    const { count: userNewCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since)

    // Get total projects
    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })

    const { count: projectNewCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since)

    return {
      totalOrganizations: orgCount || 0,
      newOrganizations: orgNewCount || 0,
      totalUsers: userCount || 0,
      newUsers: userNewCount || 0,
      totalProjects: projectCount || 0,
      newProjects: projectNewCount || 0,
    }
  } catch (error) {
    console.error('Error fetching platform stats:', error)
    return {
      totalOrganizations: 0,
      newOrganizations: 0,
      totalUsers: 0,
      newUsers: 0,
      totalProjects: 0,
      newProjects: 0,
    }
  }
}

async function getRecentOrganizations() {
  const supabase = createAdminClient()
  
  try {
    const { data: organizations } = await supabase
      .from('organizations')
      // Keep this string single-line: Supabase's type-level parser is sensitive to whitespace/newlines.
      .select('id,name,slug,owner_id,created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    const ownerIds = Array.from(
      new Set((organizations ?? []).map((o) => o.owner_id).filter(Boolean))
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

    return (organizations ?? []).map((o) => {
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
    })
  } catch (error) {
    console.error('Error fetching recent organizations:', error)
    return []
  }
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams?: { range?: string; t?: string }
}) {
  const range = (searchParams?.range === '7d' || searchParams?.range === '30d' || searchParams?.range === '90d')
    ? (searchParams.range as TimeRange)
    : '30d'

  const stats = await getPlatformStats(range)
  const recentOrganizations = await getRecentOrganizations()

  const statCards = [
    {
      title: 'Total Organizations',
      value: stats.totalOrganizations,
      icon: Building2,
      color: 'bg-blue-500',
      trend: `${stats.newOrganizations} new (${range})`,
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-green-500',
      trend: `${stats.newUsers} new (${range})`,
    },
    {
      title: 'Total Projects',
      value: stats.totalProjects,
      icon: FolderKanban,
      color: 'bg-purple-500',
      trend: `${stats.newProjects} new (${range})`,
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Welcome back! Here's an overview of your platform.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/super-admin/dashboard?range=7d&t=${Date.now()}`}
              className={`rounded-md border px-3 py-2 text-sm ${range === '7d' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            >
              7d
            </Link>
            <Link
              href={`/super-admin/dashboard?range=30d&t=${Date.now()}`}
              className={`rounded-md border px-3 py-2 text-sm ${range === '30d' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            >
              30d
            </Link>
            <Link
              href={`/super-admin/dashboard?range=90d&t=${Date.now()}`}
              className={`rounded-md border px-3 py-2 text-sm ${range === '90d' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            >
              90d
            </Link>
            <Link
              href={`/super-admin/dashboard?range=${range}&t=${Date.now()}`}
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
          Stats include totals and new entities in the selected range.
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
            </div>
          </div>
        ))}
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
                      {org.slug ? `${org.slug} • ` : ''}Owner: {org.owner?.full_name || org.owner?.email || 'Unknown'}
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
            <Link
              href="/super-admin/tenants"
              className="text-sm font-medium text-purple-600 hover:text-purple-700"
            >
              View all organizations →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

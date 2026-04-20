import Link from 'next/link'
import { BarChart3, FolderOpen, Settings, UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Tenant Admin POV: workspace overview + member management + project status.
// Data is mocked for now; wire to Supabase when ready.
export function TenantAdminDashboardHome() {
  const stats = {
    activeProjects: 0,
    totalMembers: 0,
    pendingInvites: 0,
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Workspace Overview</h1>
          <p className="mt-2 text-gray-600">
            Tenant admin dashboard for managing members and monitoring project health.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
            <Link href="/dashboard/accounts">
              <UserPlus className="mr-2 h-4 w-4" />
              Invite member
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-gray-200">
            <Link href="/settings/organization">
              <Settings className="mr-2 h-4 w-4" />
              Organization settings
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active projects</CardTitle>
            <div className="rounded-lg bg-blue-50 p-2">
              <FolderOpen className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.activeProjects}</div>
            <p className="text-xs text-gray-500 mt-1">Currently running across the workspace</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Members</CardTitle>
            <div className="rounded-lg bg-blue-50 p-2">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalMembers}</div>
            <p className="text-xs text-gray-500 mt-1">People with access to this tenant</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending invites</CardTitle>
            <div className="rounded-lg bg-blue-50 p-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.pendingInvites}</div>
            <p className="text-xs text-gray-500 mt-1">Awaiting acceptance</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-gray-200 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Project status</CardTitle>
            <CardDescription>High-level view of active projects and overall progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
              Connect your database to populate this with active projects, statuses, and owners.
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Admin actions</CardTitle>
            <CardDescription>Common workspace management actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <Link href="/dashboard/accounts">Manage accounts</Link>
            </Button>
            <Button asChild variant="outline" className="w-full border-gray-200">
              <Link href="/dashboard/projects">View projects</Link>
            </Button>
            <Button asChild variant="outline" className="w-full border-gray-200">
              <Link href="/dashboard/reports">Reports &amp; analytics</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


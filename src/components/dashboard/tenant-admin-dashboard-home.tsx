'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { BarChart3, FolderOpen, Settings, UserPlus, Users, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateOrganizationModal } from '@/components/organization/create-organization-modal'

interface Application {
  id: string
  organization_name: string
  status: 'pending' | 'approved' | 'declined' | 'revision_requested'
  revision_notes: string | null
  submitted_at: string
  reviewed_at: string | null
}

// Tenant Admin POV: workspace overview + member management + project status.
// Data is mocked for now; wire to Supabase when ready.
export function TenantAdminDashboardHome() {
  const [application, setApplication] = useState<Application | null>(null)
  const [loadingApplication, setLoadingApplication] = useState(true)
  const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Fetch application status and user email on mount
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email ?? null)

        // Fetch user's application
        const { data: apps } = await supabase
          .from('organization_applications')
          .select('*')
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: false })
          .limit(1)

        if (apps && apps.length > 0) {
          setApplication(apps[0])
        }
        setLoadingApplication(false)
      }
    }
    fetchData()
  }, [])

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

      {/* Application Status Card */}
      {!loadingApplication && (
        <div>
          {application ? (
            <div className={`rounded-lg p-6 ${
              application.status === 'approved' ? 'bg-green-50 border border-green-200' :
              application.status === 'declined' ? 'bg-red-50 border border-red-200' :
              application.status === 'revision_requested' ? 'bg-orange-50 border border-orange-200' :
              'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className="flex items-start gap-4">
                {application.status === 'pending' && (
                  <Clock className="h-6 w-6 text-yellow-600 flex-shrink-0" />
                )}
                {application.status === 'approved' && (
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                )}
                {application.status === 'declined' && (
                  <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                )}
                {application.status === 'revision_requested' && (
                  <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">
                    {application.status === 'pending' && 'Application Under Review'}
                    {application.status === 'approved' && 'Application Approved'}
                    {application.status === 'declined' && 'Application Declined'}
                    {application.status === 'revision_requested' && 'Revision Requested'}
                  </h3>
                  <p className={`text-sm mb-3 ${
                    application.status === 'approved' ? 'text-green-700' :
                    application.status === 'declined' ? 'text-red-700' :
                    application.status === 'revision_requested' ? 'text-orange-700' :
                    'text-yellow-700'
                  }`}>
                    {application.status === 'pending' && 'Your organization application is being reviewed by our team. You will be notified once a decision is made.'}
                    {application.status === 'approved' && 'Congratulations! Your organization has been approved. You now have tenant admin privileges.'}
                    {application.status === 'declined' && 'Unfortunately, your application was declined. You may submit a new application if you wish.'}
                    {application.status === 'revision_requested' && 'We need some additional information before we can approve your application.'}
                  </p>
                  {application.status === 'revision_requested' && application.revision_notes && (
                    <div className="bg-white rounded p-3 mb-3">
                      <p className="text-sm font-medium text-gray-700">Revision Notes:</p>
                      <p className="text-sm text-gray-600">{application.revision_notes}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Submitted: {new Date(application.submitted_at).toLocaleDateString()}</span>
                    {application.reviewed_at && (
                      <span>Reviewed: {new Date(application.reviewed_at).toLocaleDateString()}</span>
                    )}
                  </div>
                  {(application.status === 'declined' || application.status === 'revision_requested') && (
                    <Button
                      onClick={() => setIsCreateOrgModalOpen(true)}
                      className="mt-4"
                      variant={application.status === 'revision_requested' ? 'default' : 'outline'}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Resubmit Application
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <Building2 className="h-6 w-6 text-purple-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Create Your Organization</h3>
                  <p className="text-sm text-purple-700 mb-3">
                    Get started by creating your organization. Once approved, you'll be able to invite team members and manage projects.
                  </p>
                  <Button
                    onClick={() => setIsCreateOrgModalOpen(true)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Create Organization
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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

      <CreateOrganizationModal open={isCreateOrgModalOpen} onOpenChange={setIsCreateOrgModalOpen} userEmail={userEmail || undefined} />
    </div>
  )
}


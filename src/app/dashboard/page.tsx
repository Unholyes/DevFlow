import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { ProjectCards } from '@/components/dashboard/project-cards'
import { TaskBoard } from '@/components/dashboard/task-board'
import { TenantAdminDashboardHome } from '@/components/dashboard/tenant-admin-dashboard-home'

export default async function Dashboard() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'tenant_admin') {
    return <TenantAdminDashboardHome />
  }

import { CreateOrganizationModal } from '@/components/organization/create-organization-modal'
import { Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Application {
  id: string
  organization_name: string
  status: 'pending' | 'approved' | 'declined' | 'revision_requested'
  revision_notes: string | null
  submitted_at: string
  reviewed_at: string | null
}

export default function Dashboard() {
  const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [application, setApplication] = useState<Application | null>(null)
  const [loadingApplication, setLoadingApplication] = useState(true)

  // Fetch user email and application status on mount
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

  // Stats initialized to zero
  const stats = {
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    activeSprints: 0,
    overdueTasks: 0,
    teamMembers: 0,
  }

  // Arrays initialized to empty
  const projects: Array<{
    id: string
    name: string
    description: string
    sdlcMethodology: 'scrum' | 'kanban' | 'waterfall' | 'devops'
    status: 'active' | 'archived' | 'completed'
    progress: number
    tasksCount: number
    completedTasks: number
    dueDate: Date
  }> = []

  const tasks: Array<{
    id: string
    title: string
    status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked'
    priority: 'low' | 'medium' | 'high' | 'critical'
    assignee: string
  }> = []

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome back! Here's an overview of your projects and tasks.</p>
      </div>

      <DashboardStats stats={stats} />

      {/* Application Status Card */}
      {!loadingApplication && (
        <div className="mt-8">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2 space-y-8">
          <ProjectCards projects={projects} />
          <TaskBoard tasks={tasks} />
        </div>

        <div className="space-y-8">
          <ActivityFeed />

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setIsCreateOrgModalOpen(true)}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                >
                  Create Organization
                </button>
                <button className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  Invite Team Member
                </button>
                <button className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  Create Project
                </button>
                <button className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  Add Task
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <CreateOrganizationModal open={isCreateOrgModalOpen} onOpenChange={setIsCreateOrgModalOpen} userEmail={userEmail || undefined} />
    </DashboardLayout>
  )
}
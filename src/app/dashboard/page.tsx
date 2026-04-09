import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ProjectCards } from '@/components/dashboard/project-cards'
import { TaskBoard } from '@/components/dashboard/task-board'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'

export default async function Dashboard() {
  const supabase = createServerComponentClient({ cookies })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/login')
  }

  // Get user profile and organization info
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  const { data: organizations } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', session.user.id)

  const { data: memberships } = await supabase
    .from('organization_members')
    .select(`
      *,
      organizations (*)
    `)
    .eq('user_id', session.user.id)

  // Mock dashboard data for now - in production this would come from the database
  const mockStats = {
    totalProjects: 5,
    totalTasks: 24,
    completedTasks: 12,
    activeSprints: 2,
    overdueTasks: 3,
    teamMembers: 8,
  }

  const mockProjects = [
    {
      id: '1',
      name: 'E-commerce Platform',
      description: 'Building a modern e-commerce platform with React and Node.js',
      sdlcMethodology: 'scrum' as const,
      status: 'active' as const,
      progress: 65,
      tasksCount: 8,
      completedTasks: 5,
      dueDate: new Date('2024-02-15'),
    },
    {
      id: '2',
      name: 'Mobile App Redesign',
      description: 'Redesigning the mobile app with new UI/UX patterns',
      sdlcMethodology: 'kanban' as const,
      status: 'active' as const,
      progress: 30,
      tasksCount: 12,
      completedTasks: 4,
      dueDate: new Date('2024-03-01'),
    },
    {
      id: '3',
      name: 'API Migration',
      description: 'Migrating legacy APIs to microservices architecture',
      sdlcMethodology: 'devops' as const,
      status: 'active' as const,
      progress: 80,
      tasksCount: 6,
      completedTasks: 5,
      dueDate: new Date('2024-01-30'),
    },
  ]

  const mockTasks = [
    { id: '1', title: 'Implement user authentication', status: 'done' as const, priority: 'high' as const, assignee: 'John Doe' },
    { id: '2', title: 'Design database schema', status: 'in_progress' as const, priority: 'medium' as const, assignee: 'Jane Smith' },
    { id: '3', title: 'Create API endpoints', status: 'todo' as const, priority: 'high' as const, assignee: 'Bob Johnson' },
    { id: '4', title: 'Write unit tests', status: 'blocked' as const, priority: 'medium' as const, assignee: 'Alice Brown' },
    { id: '5', title: 'Deploy to staging', status: 'in_review' as const, priority: 'low' as const, assignee: 'Charlie Wilson' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome back! Here's an overview of your projects and tasks.
          </p>
        </div>

        {/* Stats Cards */}
        <DashboardStats stats={mockStats} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Left Column - Projects and Activity */}
          <div className="lg:col-span-2 space-y-8">
            {/* Projects Overview */}
            <ProjectCards projects={mockProjects} />

            {/* Task Board */}
            <TaskBoard tasks={mockTasks} />
          </div>

          {/* Right Column - Activity and Quick Actions */}
          <div className="space-y-8">
            {/* Activity Feed */}
            <ActivityFeed />

            {/* Quick Actions */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  {profile?.role === 'tenant_admin' && (
                    <button className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                      Invite Team Member
                    </button>
                  )}
                  <button className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Create Project
                  </button>
                  <button className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Add Task
                  </button>
                  <button
                    onClick={() => supabase.auth.signOut()}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
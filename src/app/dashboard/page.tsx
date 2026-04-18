import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { ProjectCards } from '@/components/dashboard/project-cards'
import { TaskBoard } from '@/components/dashboard/task-board'

export default function Dashboard() {
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
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back! Here's an overview of your projects and tasks.
        </p>
      </div>

      <DashboardStats stats={stats} />

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
                <button className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
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
    </DashboardLayout>
  )
}
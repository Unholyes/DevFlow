import { ProjectCards } from '@/components/dashboard/project-cards'
import { TaskBoard } from '@/components/dashboard/task-board'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'

// Mock data for demo purposes
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

export default function DashboardDemo() {
  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome to DevFlow! Here's an overview of your projects and tasks.
        </p>
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Demo Mode:</strong> This is a preview of the dashboard with mock data.
            Supabase authentication is not required for this demo view.
          </p>
        </div>
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
                <button className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                  Invite Team Member
                </button>
                <button className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  Create Project
                </button>
                <button className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  Add Task
                </button>
                <a
                  href="/"
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Back to Home
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { ProjectCards } from '@/components/dashboard/project-cards'

type ProjectCardData = {
  id: string
  name: string
  description: string
  sdlcMethodology: 'scrum' | 'kanban' | 'waterfall' | 'devops'
  status: 'active' | 'archived' | 'completed'
  progress: number
  tasksCount: number
  completedTasks: number
  dueDate: Date
}

// Mock projects data - in production this would come from database
const mockProjects: ProjectCardData[] = []

export default function ProjectsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">All Projects</h1>
          <p className="mt-2 text-gray-600">
            View and manage all your projects in one place.
          </p>
        </div>

        {/* Projects Grid */}
        <ProjectCards projects={mockProjects} showViewAll={false} />
      </div>
    </DashboardLayout>
  )
}
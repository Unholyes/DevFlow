import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { ProjectCards } from '@/components/dashboard/project-cards'

// Mock projects data - in production this would come from database
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
  {
    id: '4',
    name: 'Data Analytics Dashboard',
    description: 'Creating a comprehensive analytics dashboard for business intelligence',
    sdlcMethodology: 'scrum' as const,
    status: 'active' as const,
    progress: 45,
    tasksCount: 15,
    completedTasks: 7,
    dueDate: new Date('2024-04-15'),
  },
  {
    id: '5',
    name: 'Customer Portal',
    description: 'Developing a self-service portal for customers',
    sdlcMethodology: 'kanban' as const,
    status: 'active' as const,
    progress: 20,
    tasksCount: 10,
    completedTasks: 2,
    dueDate: new Date('2024-05-01'),
  },
  {
    id: '6',
    name: 'Legacy System Upgrade',
    description: 'Upgrading outdated systems to modern architecture',
    sdlcMethodology: 'waterfall' as const,
    status: 'active' as const,
    progress: 90,
    tasksCount: 20,
    completedTasks: 18,
    dueDate: new Date('2024-01-20'),
  },
]

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
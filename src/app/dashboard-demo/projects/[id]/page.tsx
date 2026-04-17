import { notFound } from 'next/navigation'
import { DashboardLayoutDemo } from '@/components/dashboard-demo/dashboard-layout-demo'
import { ProjectHeader } from '@/components/project/project-header'
import { ProjectStats } from '@/components/project/project-stats'
import { TaskBoard } from '@/components/dashboard-demo/task-board-demo'

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
    teamMembers: 4,
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
    teamMembers: 3,
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
    teamMembers: 5,
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
    teamMembers: 6,
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
    teamMembers: 4,
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
    teamMembers: 7,
  },
]

// Mock tasks for each project
const mockTasksByProject = {
  '1': [
    { id: '1', title: 'Implement user authentication', status: 'done' as const, priority: 'high' as const, assignee: 'John Doe' },
    { id: '2', title: 'Design database schema', status: 'in_progress' as const, priority: 'medium' as const, assignee: 'Jane Smith' },
    { id: '3', title: 'Create API endpoints', status: 'todo' as const, priority: 'high' as const, assignee: 'Bob Johnson' },
    { id: '4', title: 'Write unit tests', status: 'blocked' as const, priority: 'medium' as const, assignee: 'Alice Brown' },
  ],
  '2': [
    { id: '5', title: 'Update UI components', status: 'in_progress' as const, priority: 'high' as const, assignee: 'John Doe' },
    { id: '6', title: 'Optimize performance', status: 'todo' as const, priority: 'medium' as const, assignee: 'Jane Smith' },
    { id: '7', title: 'Add new features', status: 'todo' as const, priority: 'low' as const, assignee: 'Bob Johnson' },
  ],
  '3': [
    { id: '8', title: 'Migrate auth service', status: 'done' as const, priority: 'high' as const, assignee: 'Alice Brown' },
    { id: '9', title: 'Update deployment pipeline', status: 'in_progress' as const, priority: 'high' as const, assignee: 'Charlie Wilson' },
  ],
  '4': [
    { id: '10', title: 'Design data models', status: 'done' as const, priority: 'high' as const, assignee: 'John Doe' },
    { id: '11', title: 'Implement charts', status: 'in_progress' as const, priority: 'medium' as const, assignee: 'Jane Smith' },
    { id: '12', title: 'Add filters', status: 'todo' as const, priority: 'low' as const, assignee: 'Bob Johnson' },
  ],
  '5': [
    { id: '13', title: 'Create login page', status: 'done' as const, priority: 'high' as const, assignee: 'Alice Brown' },
    { id: '14', title: 'Build dashboard', status: 'in_progress' as const, priority: 'medium' as const, assignee: 'Charlie Wilson' },
  ],
  '6': [
    { id: '15', title: 'Audit legacy code', status: 'done' as const, priority: 'high' as const, assignee: 'John Doe' },
    { id: '16', title: 'Migrate database', status: 'done' as const, priority: 'high' as const, assignee: 'Jane Smith' },
    { id: '17', title: 'Update APIs', status: 'in_progress' as const, priority: 'medium' as const, assignee: 'Bob Johnson' },
  ],
}

interface ProjectPageProps {
  params: {
    id: string
  }
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const project = mockProjects.find(p => p.id === params.id)
  const tasks = mockTasksByProject[params.id as keyof typeof mockTasksByProject] || []

  if (!project) {
    notFound()
  }

  return (
    <DashboardLayoutDemo>
      <div className="space-y-8">
        {/* Project Header */}
        <ProjectHeader project={project} />

        {/* Project Stats */}
        <ProjectStats project={project} />

        {/* Task Board */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Task Board</h3>
            <TaskBoard tasks={tasks} />
          </div>
        </div>

        {/* Additional sections can be added here */}
        {/* - Burndown chart for Scrum */}
        {/* - Team workload */}
        {/* - Calendar view */}
        {/* - Project settings */}
      </div>
    </DashboardLayoutDemo>
  )
}
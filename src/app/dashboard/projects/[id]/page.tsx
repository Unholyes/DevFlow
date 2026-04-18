import { notFound } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { ProjectHeader } from '@/components/project/project-header'
import { ProjectStats } from '@/components/project/project-stats'
import { TaskBoard } from '@/components/dashboard/task-board'

type ProjectDetailData = {
  id: string
  name: string
  description: string
  sdlcMethodology: 'scrum' | 'kanban' | 'waterfall' | 'devops'
  status: 'active' | 'archived' | 'completed'
  progress: number
  tasksCount: number
  completedTasks: number
  dueDate: Date
  teamMembers: number
}

type TaskBoardItem = {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignee: string
}

// Mock projects data - in production this would come from database
const mockProjects: ProjectDetailData[] = []

// Mock tasks for each project
const mockTasksByProject: Record<string, TaskBoardItem[]> = {}

interface ProjectPageProps {
  params: {
    id: string
  }
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const project = mockProjects.find(p => p.id === params.id)
  const tasks = mockTasksByProject[params.id] ?? []

  if (!project) {
    notFound()
  }

  return (
    <DashboardLayout>
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
    </DashboardLayout>
  )
}
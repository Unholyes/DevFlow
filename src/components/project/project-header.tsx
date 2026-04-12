import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarDays, Settings, Users } from 'lucide-react'
import { Project } from '@/types'

interface ProjectHeaderProps {
  project: {
    id: string
    name: string
    description: string
    sdlcMethodology: Project['sdlcMethodology']
    status: Project['status']
    progress: number
    tasksCount: number
    completedTasks: number
    dueDate: Date
    teamMembers: number
  }
}

const sdlcColors = {
  scrum: 'bg-blue-100 text-blue-800',
  kanban: 'bg-green-100 text-green-800',
  waterfall: 'bg-purple-100 text-purple-800',
  devops: 'bg-orange-100 text-orange-800',
}

const statusColors = {
  active: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-800',
  completed: 'bg-blue-100 text-blue-800',
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <Badge
                variant="secondary"
                className={`${statusColors[project.status]} text-sm`}
              >
                {project.status}
              </Badge>
              <Badge
                variant="outline"
                className={`${sdlcColors[project.sdlcMethodology]} text-sm capitalize`}
              >
                {project.sdlcMethodology}
              </Badge>
            </div>
            <p className="text-gray-600 mb-4">{project.description}</p>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{project.teamMembers} members</span>
              </div>
              <div className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                <span>Due {project.dueDate.toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 ml-4">
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              Manage Team
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
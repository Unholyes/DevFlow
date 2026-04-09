import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CalendarDays, Users, CheckCircle } from 'lucide-react'
import { Project } from '@/types'

interface ProjectCardsProps {
  projects: Array<{
    id: string
    name: string
    description: string
    sdlcMethodology: Project['sdlcMethodology']
    status: Project['status']
    progress: number
    tasksCount: number
    completedTasks: number
    dueDate: Date
  }>
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

export function ProjectCards({ projects }: ProjectCardsProps) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Active Projects</h3>
          <button className="text-sm text-blue-600 hover:text-blue-500">
            View all projects
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base font-medium text-gray-900 line-clamp-2">
                    {project.name}
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className={`${statusColors[project.status]} text-xs`}
                  >
                    {project.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    variant="outline"
                    className={`${sdlcColors[project.sdlcMethodology]} text-xs capitalize`}
                  >
                    {project.sdlcMethodology}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 line-clamp-2">
                  {project.description}
                </p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    <span>{project.completedTasks}/{project.tasksCount} tasks</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CalendarDays className="h-4 w-4" />
                    <span>{project.dueDate.toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
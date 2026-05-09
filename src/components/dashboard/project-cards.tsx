import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { CalendarDays, CheckCircle, FolderKanban } from 'lucide-react'
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
  showViewAll?: boolean
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

export function ProjectCards({ projects, showViewAll = true }: ProjectCardsProps) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Active Projects</h3>
          {showViewAll && (
            <Link href="/dashboard/projects" className="text-sm text-blue-600 hover:text-blue-500">
              View all projects
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 auto-rows-[308px] sm:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
          {projects.length === 0 ? (
            <div className="sm:col-span-2 xl:col-span-3 rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-6 py-12 text-center">
              <FolderKanban className="mx-auto h-10 w-10 text-gray-400" aria-hidden />
              <h4 className="mt-4 text-sm font-semibold text-gray-900">No active projects yet</h4>
              <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
                When projects are set to active, they will show up here with progress and task counts.
              </p>
              <Button asChild className="mt-6" variant="default">
                <Link href="/dashboard/projects">Browse projects</Link>
              </Button>
            </div>
          ) : null}
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="block h-full min-h-0"
            >
              <Card className="flex h-full flex-col overflow-hidden border-gray-200 shadow-sm transition-shadow hover:shadow-md cursor-pointer">
                <CardHeader className="shrink-0 space-y-2 pb-2 pt-5 px-5 sm:pt-6 sm:px-6">
                  <div className="flex items-start justify-between gap-2 min-h-[2.75rem]">
                    <CardTitle className="text-base font-medium text-gray-900 line-clamp-2 min-w-0 flex-1 leading-snug">
                      {project.name}
                    </CardTitle>
                    <Badge
                      variant="secondary"
                      className={`${statusColors[project.status]} shrink-0 text-xs capitalize`}
                    >
                      {project.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`${sdlcColors[project.sdlcMethodology]} text-xs capitalize`}
                    >
                      {project.sdlcMethodology}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-3 px-5 pb-5 pt-0 sm:px-6 sm:pb-6 min-h-0">
                  <p className="text-sm text-gray-600 line-clamp-3 min-h-[3.75rem] leading-relaxed">
                    {project.description?.trim() ? project.description : 'No description yet.'}
                  </p>

                  <div className="mt-auto space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium tabular-nums">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm text-gray-600 border-t border-gray-100 pt-3">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <CheckCircle className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                        <span className="truncate tabular-nums">
                          {project.completedTasks}/{project.tasksCount} tasks
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <CalendarDays className="h-4 w-4 text-gray-500" aria-hidden />
                        <span className="tabular-nums whitespace-nowrap">
                          {project.dueDate.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
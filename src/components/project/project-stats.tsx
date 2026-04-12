import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Clock, TrendingUp, Users } from 'lucide-react'
import { Project } from '@/types'

interface ProjectStatsProps {
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

export function ProjectStats({ project }: ProjectStatsProps) {
  const completedTasks = project.completedTasks
  const totalTasks = project.tasksCount
  const progress = project.progress
  const teamMembers = project.teamMembers

  // Calculate days remaining
  const today = new Date()
  const dueDate = project.dueDate
  const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Progress Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Progress</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{progress}%</div>
          <Progress value={progress} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {completedTasks} of {totalTasks} tasks completed
          </p>
        </CardContent>
      </Card>

      {/* Tasks Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tasks</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTasks}</div>
          <p className="text-xs text-muted-foreground">
            {completedTasks} completed, {totalTasks - completedTasks} remaining
          </p>
        </CardContent>
      </Card>

      {/* Team Members Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Team</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{teamMembers}</div>
          <p className="text-xs text-muted-foreground">
            Active members
          </p>
        </CardContent>
      </Card>

      {/* Deadline Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Deadline</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {daysRemaining > 0 ? `${daysRemaining}d` : 'Overdue'}
          </div>
          <p className="text-xs text-muted-foreground">
            {dueDate.toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
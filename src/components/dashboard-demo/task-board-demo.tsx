import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Task } from '@/types'
import { User, AlertCircle, Clock, CheckCircle } from 'lucide-react'

interface TaskBoardProps {
  tasks: Array<{
    id: string
    title: string
    status: Task['status']
    priority: Task['priority']
    assignee: string
  }>
}

const statusConfig = {
  todo: {
    label: 'To Do',
    color: 'bg-gray-100 text-gray-800',
    icon: Clock,
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-blue-100 text-blue-800',
    icon: User,
  },
  in_review: {
    label: 'In Review',
    color: 'bg-yellow-100 text-yellow-800',
    icon: AlertCircle,
  },
  done: {
    label: 'Done',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
  },
  blocked: {
    label: 'Blocked',
    color: 'bg-red-100 text-red-800',
    icon: AlertCircle,
  },
}

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}

export function TaskBoard({ tasks }: TaskBoardProps) {
  const tasksByStatus = tasks.reduce((acc, task) => {
    if (!acc[task.status]) {
      acc[task.status] = []
    }
    acc[task.status].push(task)
    return acc
  }, {} as Record<string, typeof tasks>)

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Task Board</h3>
          <button className="text-sm text-blue-600 hover:text-blue-500">
            View full board
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Object.entries(statusConfig).map(([status, config]) => {
            const tasksInStatus = tasksByStatus[status] || []
            const Icon = config.icon

            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-gray-600" />
                  <h4 className="text-sm font-medium text-gray-900">
                    {config.label}
                  </h4>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {tasksInStatus.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {tasksInStatus.map((task) => (
                    <Card key={task.id} className="p-3 hover:shadow-sm transition-shadow cursor-pointer">
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-gray-900 line-clamp-2">
                          {task.title}
                        </h5>
                        <div className="flex items-center justify-between">
                          <Badge
                            variant="secondary"
                            className={`${priorityColors[task.priority]} text-xs`}
                          >
                            {task.priority}
                          </Badge>
                          <span className="text-xs text-gray-600 truncate ml-2">
                            {task.assignee}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {tasksInStatus.length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
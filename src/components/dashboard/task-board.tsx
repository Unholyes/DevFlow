'use client'

import { Card } from '@/components/ui/card'
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
  todo: { label: 'To Do', color: 'bg-gray-100 text-gray-800', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: User },
  in_review: { label: 'In Review', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  done: { label: 'Done', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  blocked: { label: 'Blocked', color: 'bg-red-100 text-red-800', icon: AlertCircle },
}

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}

export function TaskBoard({ tasks }: TaskBoardProps) {
  // Group tasks by status dynamically
  const tasksByStatus = tasks.reduce((acc, task) => {
    if (!acc[task.status]) acc[task.status] = []
    acc[task.status].push(task)
    return acc
  }, {} as Record<string, typeof tasks>)

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Task Board</h3>
          <button className="text-sm text-blue-600 hover:text-blue-500 font-medium">
            View full board
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Object.entries(statusConfig).map(([status, config]) => {
            const tasksInStatus = tasksByStatus[status] || []
            const Icon = config.icon

            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                  <Icon className="h-4 w-4 text-gray-500" />
                  <h4 className="text-sm font-semibold text-gray-700">{config.label}</h4>
                  <span className="ml-auto text-xs font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                    {tasksInStatus.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {tasksInStatus.map((task) => (
                    <Card key={task.id} className="p-3 hover:shadow-md transition-shadow cursor-pointer border-gray-200">
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
                          {task.title}
                        </h5>
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="secondary" className={`${priorityColors[task.priority]} text-[10px] px-1.5 py-0 capitalize font-medium`}>
                            {task.priority}
                          </Badge>
                          <span className="text-[11px] text-gray-500 truncate italic">
                            {task.assignee}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {tasksInStatus.length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed border-gray-50 rounded-lg text-gray-400 text-xs">
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { CheckCircle, Plus, MessageCircle, GitBranch } from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'task_completed' | 'task_created' | 'comment_added' | 'branch_created'
  user: string
  userInitials: string
  action: string
  target: string
  timestamp: string
}

const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'task_completed',
    user: 'John Doe',
    userInitials: 'JD',
    action: 'completed task',
    target: 'Implement user authentication',
    timestamp: '2 hours ago',
  },
  {
    id: '2',
    type: 'task_created',
    user: 'Jane Smith',
    userInitials: 'JS',
    action: 'created task',
    target: 'Design database schema',
    timestamp: '4 hours ago',
  },
  {
    id: '3',
    type: 'comment_added',
    user: 'Bob Johnson',
    userInitials: 'BJ',
    action: 'commented on',
    target: 'API endpoints task',
    timestamp: '6 hours ago',
  },
  {
    id: '4',
    type: 'branch_created',
    user: 'Alice Brown',
    userInitials: 'AB',
    action: 'created branch',
    target: 'feature/user-auth',
    timestamp: '1 day ago',
  },
  {
    id: '5',
    type: 'task_completed',
    user: 'Charlie Wilson',
    userInitials: 'CW',
    action: 'completed task',
    target: 'Write unit tests',
    timestamp: '1 day ago',
  },
]

const activityIcons = {
  task_completed: CheckCircle,
  task_created: Plus,
  comment_added: MessageCircle,
  branch_created: GitBranch,
}

const activityColors = {
  task_completed: 'text-green-600',
  task_created: 'text-blue-600',
  comment_added: 'text-purple-600',
  branch_created: 'text-orange-600',
}

export function ActivityFeed() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium text-gray-900">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mockActivities.map((activity) => {
          const Icon = activityIcons[activity.type]
          const colorClass = activityColors[activity.type]

          return (
            <div key={activity.id} className="flex items-start space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {activity.userInitials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <Icon className={`h-4 w-4 ${colorClass}`} />
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity.user}</span>{' '}
                    {activity.action}{' '}
                    <span className="font-medium text-gray-600">
                      {activity.target}
                    </span>
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {activity.timestamp}
                </p>
              </div>
            </div>
          )
        })}

        <div className="pt-2">
          <button className="text-sm text-blue-600 hover:text-blue-500">
            View all activity
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { CheckCircle, Plus, MessageCircle, GitBranch } from 'lucide-react'

// Exporting the interface so you can use it when fetching real data
export interface ActivityItem {
  id: string
  type: 'task_completed' | 'task_created' | 'comment_added' | 'branch_created'
  user: string
  userInitials: string
  action: string
  target: string
  timestamp: string
}

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
  // Initialized as an empty array - ready for real data from an API or Supabase
  const [activities, setActivities] = useState<ActivityItem[]>([])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium text-gray-900">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-gray-500">No recent activity found.</p>
          </div>
        ) : (
          activities.map((activity) => {
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
          })
        )}

        {activities.length > 0 && (
          <div className="pt-2">
            <button className="text-sm text-blue-600 hover:text-blue-500">
              View all activity
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
'use client'

import { useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { CheckCircle, Plus, MessageCircle, GitBranch } from 'lucide-react'
import type { MemberDashboardActivity } from '@/lib/dashboard/load-team-member-dashboard'

export type ActivityItem = MemberDashboardActivity

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

interface ActivityFeedProps {
  activities: ActivityItem[]
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const rows = useMemo(() => activities ?? [], [activities])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium text-gray-900">Recent activity</CardTitle>
        <p className="text-sm text-gray-500 font-normal leading-relaxed">
          Latest task updates and comments in your workspace.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <div className="py-6 text-center px-2">
            <p className="text-sm text-gray-600">No recent activity yet.</p>
            <p className="mt-2 text-xs text-gray-500 leading-relaxed">
              Completing tasks and adding comments will show up here for your team.
            </p>
          </div>
        ) : (
          rows.map((activity) => {
            const Icon = activityIcons[activity.type]
            const colorClass = activityColors[activity.type]
            const relative = (() => {
              try {
                return formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })
              } catch {
                return activity.timestamp
              }
            })()

            return (
              <div key={activity.id} className="flex items-start space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{activity.userInitials}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <Icon className={`h-4 w-4 shrink-0 ${colorClass}`} />
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.user}</span> {activity.action}{' '}
                      <span className="font-medium text-gray-600">{activity.target}</span>
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{relative}</p>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

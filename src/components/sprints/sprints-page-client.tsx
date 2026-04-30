'use client'

import Link from 'next/link'
import { Plus, CheckCircle2, ArrowLeft, PlayCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type SprintRow = {
  id: string
  name: string
  start_date: string
  end_date: string
  status: 'planned' | 'active' | 'closed'
  story_points_total: number
}

export type SprintWithStats = SprintRow & {
  tasks_total: number
  tasks_completed: number
}

export function SprintsPageClient(props: {
  projectId: string
  phaseId: string
  processId?: string
  processName?: string
  processMethod?: string
  sprints: SprintWithStats[]
  selectedProcessName?: string | null
  selectedMethod?: string | null
}) {
  // Treat "planned" as active for MVP until we add a dedicated planned view.
  const activeSprints = props.sprints.filter((s) => s.status === 'active' || s.status === 'planned')
  const completedSprints = props.sprints.filter((s) => s.status === 'closed')
  const totalStoryPoints = props.sprints.reduce((sum, s) => sum + (s.story_points_total || 0), 0)
  const averageVelocity = props.sprints.length ? Math.round(totalStoryPoints / props.sprints.length) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Link
          href={`/dashboard/projects/${props.projectId}/phases/${props.phaseId}`}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Phase Overview
        </Link>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sprints</h1>
          <p className="text-gray-600 mt-1">Manage and track sprints for this phase</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={
              props.processId
                ? `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/processes/${props.processId}/sprints/plan`
                : `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/sprints/plan`
            }
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Sprint
          </Link>
        </div>
      </div>

      {props.processName || props.selectedProcessName ? (
        <Card className="border-blue-200 bg-blue-50 shadow-sm">
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-blue-700">Active process</p>
            <p className="mt-1 text-sm font-semibold text-blue-900">
              {props.processName ?? props.selectedProcessName}{' '}
              {props.processMethod || props.selectedMethod ? `(${props.processMethod ?? props.selectedMethod})` : ''}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Sprints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{props.sprints.length}</div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeSprints.length}</div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedSprints.length}</div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Velocity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{averageVelocity}</div>
            <div className="text-xs text-gray-500 mt-1">points/sprint</div>
          </CardContent>
        </Card>
      </div>

      {activeSprints.length > 0 && (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Active Sprints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeSprints.map((sprint) => (
                <div key={sprint.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <PlayCircle className="h-5 w-5 text-blue-600" />
                      <div>
                        <h3 className="font-semibold text-blue-900">{sprint.name}</h3>
                        <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                          <span>
                            {sprint.start_date} - {sprint.end_date}
                          </span>
                          <span>•</span>
                          <span>{sprint.story_points_total} story points</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-blue-100 text-blue-700">Active</Badge>
                      <Link
                        href={
                          props.processId
                            ? `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/processes/${props.processId}/board?sprintId=${encodeURIComponent(
                                sprint.id
                              )}`
                            : `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/sprints/${sprint.id}`
                        }
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                    <span>
                      {sprint.tasks_completed}/{sprint.tasks_total} tasks completed
                    </span>
                    <span>•</span>
                    <span>
                      {sprint.tasks_total
                        ? Math.round((sprint.tasks_completed / sprint.tasks_total) * 100)
                        : 0}
                      % complete
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${sprint.tasks_total ? (sprint.tasks_completed / sprint.tasks_total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Completed Sprints</CardTitle>
        </CardHeader>
        <CardContent>
          {completedSprints.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No completed sprints yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedSprints.map((sprint) => (
                <div
                  key={sprint.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <h3 className="font-medium text-gray-900">{sprint.name}</h3>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                        <span>
                          {sprint.start_date} - {sprint.end_date}
                        </span>
                        <span>•</span>
                        <span>{sprint.story_points_total} story points</span>
                        <span>•</span>
                        <span>
                          {sprint.tasks_completed}/{sprint.tasks_total} tasks
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link
                    href={
                      props.processId
                        ? `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/processes/${props.processId}/board?sprintId=${encodeURIComponent(
                            sprint.id
                          )}`
                        : `/dashboard/projects/${props.projectId}/phases/${props.phaseId}/sprints/${sprint.id}`
                    }
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


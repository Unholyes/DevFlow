'use client'

import { useMemo } from 'react'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import {
  DashboardAttentionStrip,
  type SprintAttentionHint,
} from '@/components/dashboard/dashboard-attention-strip'
import { ProjectCards } from '@/components/dashboard/project-cards'
import { TaskBoard } from '@/components/dashboard/task-board'
import { TaskStatusSummary } from '@/components/dashboard/task-status-summary'
import {
  computeMemberAttentionMetrics,
  countTasksByStatus,
} from '@/lib/dashboard/member-attention'
import type {
  MemberDashboardActivity,
  MemberDashboardProject,
  MemberDashboardSprintHint,
  MemberDashboardTask,
} from '@/lib/dashboard/load-team-member-dashboard'
interface TeamMemberDashboardProps {
  displayName: string
  projects: MemberDashboardProject[]
  myTasks: MemberDashboardTask[]
  activities: MemberDashboardActivity[]
  sprintHint: MemberDashboardSprintHint | null
}

function parseDueDate(iso: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(iso)
}

function formatTaskSummary(metrics: ReturnType<typeof computeMemberAttentionMetrics>): string {
  const parts: string[] = []
  if (metrics.assigned > 0) {
    parts.push(`${metrics.assigned} open ${metrics.assigned === 1 ? 'task' : 'tasks'}`)
  }
  if (metrics.overdue > 0) parts.push(`${metrics.overdue} overdue`)
  if (metrics.dueThisWeek > 0) parts.push(`${metrics.dueThisWeek} due this week`)
  return parts.join(' · ')
}

export function TeamMemberDashboard({
  displayName,
  projects,
  myTasks,
  activities,
  sprintHint,
}: TeamMemberDashboardProps) {
  const firstName = displayName.trim().split(/\s+/)[0] || 'there'

  const attentionMetrics = useMemo(
    () => computeMemberAttentionMetrics(myTasks),
    [myTasks]
  )
  const statusCounts = useMemo(() => countTasksByStatus(myTasks), [myTasks])
  const taskSummary = useMemo(() => formatTaskSummary(attentionMetrics), [attentionMetrics])

  const sprintAttention: SprintAttentionHint | null = sprintHint

  const projectCards = projects.map((p) => ({
    ...p,
    dueDate: parseDueDate(p.dueDate),
  }))

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back, {firstName}. Here&apos;s what needs your attention today.
        </p>
      </div>

      <div className="mt-4">
        <DashboardAttentionStrip
          metrics={attentionMetrics}
          activeProjectCount={projects.length}
          sprintHint={sprintAttention}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <TaskBoard
            tasks={myTasks}
            boardTitle="Your tasks"
            boardDescription={taskSummary || 'Tasks assigned to you, grouped by status.'}
            headerExtra={<TaskStatusSummary counts={statusCounts} />}
          />
          <ProjectCards projects={projectCards} />
        </div>

        <div className="space-y-8">
          <ActivityFeed activities={activities} />
        </div>
      </div>
    </>
  )
}

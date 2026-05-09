'use client'

import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { ProjectCards } from '@/components/dashboard/project-cards'
import { TaskBoard } from '@/components/dashboard/task-board'
import type { MemberDashboardActivity, MemberDashboardProject, MemberDashboardTask } from '@/lib/dashboard/load-team-member-dashboard'
import type { Project } from '@/types'

interface TeamMemberDashboardProps {
  userId: string
  stats: {
    totalProjects: number
    totalTasks: number
    completedTasks: number
    activeSprints: number
    overdueTasks: number
    teamMembers: number
  }
  projects: MemberDashboardProject[]
  myTasks: MemberDashboardTask[]
  activities: MemberDashboardActivity[]
}

function parseDueDate(iso: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(iso)
}

export function TeamMemberDashboard({
  userId: _userId,
  stats,
  projects,
  myTasks,
  activities,
}: TeamMemberDashboardProps) {
  const projectCards: Array<{
    id: string
    name: string
    description: string
    sdlcMethodology: Project['sdlcMethodology']
    status: Project['status']
    progress: number
    tasksCount: number
    completedTasks: number
    dueDate: Date
  }> = projects.map((p) => ({
    ...p,
    dueDate: parseDueDate(p.dueDate),
  }))

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome back! Here&apos;s an overview of your projects and tasks.</p>
        <p className="mt-2 text-sm text-gray-500 max-w-3xl leading-relaxed">
          The numbers above reflect your whole workspace. Active projects, your task board preview, and recent activity help you focus on what matters today.
        </p>
      </div>

      <DashboardStats stats={stats} />

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <ProjectCards projects={projectCards} />
          <TaskBoard tasks={myTasks} boardTitle="Your tasks" boardDescription="Only tasks assigned to you (workspace totals may be higher)." />
        </div>

        <div className="space-y-8">
          <ActivityFeed activities={activities} />
        </div>
      </div>
    </>
  )
}

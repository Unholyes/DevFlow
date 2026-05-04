'use client'

import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { ProjectCards } from '@/components/dashboard/project-cards'
import { TaskBoard } from '@/components/dashboard/task-board'

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
}

export function TeamMemberDashboard({ userId, stats }: TeamMemberDashboardProps) {
  // Arrays initialized to empty
  const projects: Array<{
    id: string
    name: string
    description: string
    sdlcMethodology: 'scrum' | 'kanban' | 'waterfall' | 'devops'
    status: 'active' | 'archived' | 'completed'
    progress: number
    tasksCount: number
    completedTasks: number
    dueDate: Date
  }> = []

  const tasks: Array<{
    id: string
    title: string
    status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked'
    priority: 'low' | 'medium' | 'high' | 'critical'
    assignee: string
  }> = []

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome back! Here's an overview of your projects and tasks.</p>
      </div>

      <DashboardStats stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        <div className="lg:col-span-2 space-y-8">
          <ProjectCards projects={projects} />
          <TaskBoard tasks={tasks} />
        </div>

        <div className="space-y-8">
          <ActivityFeed />
        </div>
      </div>
    </>
  )
}

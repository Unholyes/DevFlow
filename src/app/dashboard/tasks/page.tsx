import type { Metadata } from 'next'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { TasksPageContent } from '@/components/dashboard/tasks-page-content'

export const metadata: Metadata = {
  title: 'Tasks | DevFlow',
  description:
    'Search, filter, and inspect work items with project keys, status, priority, and full issue details.',
}

export default function TasksPage() {
  return (
    <DashboardLayout>
      <TasksPageContent />
    </DashboardLayout>
  )
}

import type { Metadata } from 'next'
import { DashboardLayoutDemo } from '@/components/dashboard-demo/dashboard-layout-demo'
import { TasksPageContent } from '@/components/dashboard-demo/tasks-page-content-demo'

export const metadata: Metadata = {
  title: 'Tasks | DevFlow',
  description:
    'Search, filter, and inspect work items with project keys, status, priority, and full issue details.',
}

export default function TasksPage() {
  return (
    <DashboardLayoutDemo>
      <TasksPageContent />
    </DashboardLayoutDemo>
  )
}

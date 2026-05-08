import type { Metadata } from 'next'
import { Suspense } from 'react'
import { TasksPageContent } from '@/components/dashboard/tasks-page-content'

export const metadata: Metadata = {
  title: 'Tasks | DevFlow',
  description: 'See tasks assigned to you, open full details, and jump to the board.',
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-500">Loading tasks…</div>}>
      <TasksPageContent />
    </Suspense>
  )
}

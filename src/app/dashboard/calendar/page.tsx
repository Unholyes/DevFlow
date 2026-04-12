import type { Metadata } from 'next'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { CalendarPageContent } from '@/components/dashboard/calendar-page-content'

export const metadata: Metadata = {
  title: 'Calendar | DevFlow',
  description:
    'View the month at a glance and track upcoming task, sprint, and milestone deadlines across projects.',
}

export default function CalendarPage() {
  return (
    <DashboardLayout>
      <CalendarPageContent />
    </DashboardLayout>
  )
}

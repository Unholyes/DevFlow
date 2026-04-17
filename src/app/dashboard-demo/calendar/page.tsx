import type { Metadata } from 'next'
import { DashboardLayoutDemo } from '@/components/dashboard-demo/dashboard-layout-demo'
import { CalendarPageContent } from '@/components/dashboard-demo/calendar-page-content-demo'

export const metadata: Metadata = {
  title: 'Calendar | DevFlow',
  description:
    'View the month at a glance and track upcoming task, sprint, and milestone deadlines across projects.',
}

export default function CalendarPage() {
  return (
    <DashboardLayoutDemo>
      <CalendarPageContent />
    </DashboardLayoutDemo>
  )
}

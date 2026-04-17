import type { Metadata } from 'next'
import { DashboardLayoutDemo } from '@/components/dashboard-demo/dashboard-layout-demo'
import { ReportsAnalyticsContent } from '@/components/dashboard-demo/reports-analytics-content-demo'

export const metadata: Metadata = {
  title: 'Reports & Analytics | DevFlow',
  description:
    'Analyze team performance, workloads, sprint burndown, task status, and recent activity across your workspace.',
}

export default function ReportsAnalyticsPage() {
  return (
    <DashboardLayoutDemo>
      <ReportsAnalyticsContent />
    </DashboardLayoutDemo>
  )
}

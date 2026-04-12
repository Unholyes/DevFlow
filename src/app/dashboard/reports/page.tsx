import type { Metadata } from 'next'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { ReportsAnalyticsContent } from '@/components/dashboard/reports-analytics-content'

export const metadata: Metadata = {
  title: 'Reports & Analytics | DevFlow',
  description:
    'Analyze team performance, workloads, sprint burndown, task status, and recent activity across your workspace.',
}

export default function ReportsAnalyticsPage() {
  return (
    <DashboardLayout>
      <ReportsAnalyticsContent />
    </DashboardLayout>
  )
}

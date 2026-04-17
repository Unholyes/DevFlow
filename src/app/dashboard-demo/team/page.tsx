import type { Metadata } from 'next'
import { DashboardLayoutDemo } from '@/components/dashboard-demo/dashboard-layout-demo'
import { TeamPageContent } from '@/components/dashboard-demo/team-page-content-demo'

export const metadata: Metadata = {
  title: 'Team | DevFlow',
  description:
    'View workspace members, project assignments, and pending invitations for your DevFlow organization.',
}

export default function TeamPage() {
  return (
    <DashboardLayoutDemo>
      <TeamPageContent />
    </DashboardLayoutDemo>
  )
}

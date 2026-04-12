import type { Metadata } from 'next'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { TeamPageContent } from '@/components/dashboard/team-page-content'

export const metadata: Metadata = {
  title: 'Team | DevFlow',
  description:
    'View workspace members, project assignments, and pending invitations for your DevFlow organization.',
}

export default function TeamPage() {
  return (
    <DashboardLayout>
      <TeamPageContent />
    </DashboardLayout>
  )
}

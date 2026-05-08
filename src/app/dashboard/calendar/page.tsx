import type { Metadata } from 'next'
import { CalendarPageContent } from '@/components/dashboard/calendar-page-content'

export const metadata: Metadata = {
  title: 'Calendar | DevFlow',
  description:
    'Your task due dates, sprint dates on your projects, and project target dates in one calendar view.',
}

export default function CalendarPage() {
  return <CalendarPageContent />
}

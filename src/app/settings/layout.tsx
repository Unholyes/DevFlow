import type { ReactNode } from 'react'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'

interface SettingsLayoutProps {
  children: ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return <DashboardLayout>{children}</DashboardLayout>
}

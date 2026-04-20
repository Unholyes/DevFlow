import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import type { UserRole } from '@/types'

interface SettingsLayoutProps {
  children: ReactNode
}

export default async function SettingsLayout({ children }: SettingsLayoutProps) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profile?.role ?? 'team_member') as UserRole

  // Redirect super admins to their dashboard
  if (role === 'super_admin') {
    redirect('/super-admin/dashboard')
  }

  return <DashboardLayout role={role}>{children}</DashboardLayout>
}

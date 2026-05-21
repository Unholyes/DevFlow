import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { buildOrganizationTheme, ORGANIZATION_THEME_COLUMNS } from '@/lib/theme/load-organization-theme'
import type { UserRole } from '@/types'
import { resolveWorkspaceContext } from '@/lib/auth/resolve-workspace-role'

export default async function DashboardRouteLayout({ children }: { children: ReactNode }) {
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

  // Redirect super admins to their dashboard (global role).
  if (profile?.role === 'super_admin') {
    redirect('/super-admin/dashboard')
  }

  const ws = await resolveWorkspaceContext({ supabase: supabase as any, userId: user.id })
  const role = ws.role as UserRole

  // First-time tenant setup: if this workspace has no projects yet, tenant admins complete
  // the wizard before the main dashboard (works on base host e.g. localhost as well as tenant subdomains).
  if (role === 'tenant_admin' && ws.organizationId) {
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('organization_id', ws.organizationId)
      .limit(1)
      .maybeSingle()

    if (!project?.id) {
      redirect('/onboarding/setup')
    }
  }

  let sidebarProjects: { id: string; name: string }[] = []
  let organizationTheme = undefined

  if (ws.organizationId) {
    const { data: projectRows } = await supabase
      .from('projects')
      .select('id,name')
      .eq('organization_id', ws.organizationId)
      .order('created_at', { ascending: false })
      .limit(4)
    sidebarProjects = projectRows ?? []

    const { data: orgData } = await supabase
      .from('organizations')
      .select(ORGANIZATION_THEME_COLUMNS)
      .eq('id', ws.organizationId)
      .single()

    organizationTheme = buildOrganizationTheme(orgData)
  }

  return (
    <ThemeProvider organizationTheme={organizationTheme}>
      <DashboardLayout role={role} sidebarProjects={sidebarProjects}>
        {children}
      </DashboardLayout>
    </ThemeProvider>
  )
}


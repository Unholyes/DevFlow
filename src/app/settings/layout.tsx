import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { buildOrganizationTheme, ORGANIZATION_THEME_COLUMNS } from '@/lib/theme/load-organization-theme'
import type { UserRole } from '@/types'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolveWorkspaceContext } from '@/lib/auth/resolve-workspace-role'
import { loadMemberProjectIds, loadSidebarProjects } from '@/lib/dashboard/load-sidebar-projects'

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

  // Redirect super admins to their dashboard
  if (profile?.role === 'super_admin') {
    redirect('/super-admin/dashboard')
  }

  const ws = await resolveWorkspaceContext({ supabase: supabase as any, userId: user.id })
  const role = ws.role as UserRole

  let memberProjectIds: string[] = []
  if (role === 'team_member') {
    memberProjectIds = await loadMemberProjectIds(supabase as any, user.id)
  }

  // Tenant-domain onboarding wizard gate:
  // if we're on a tenant subdomain and the org has no projects yet, force the setup wizard.
  const tenantSlug = getTenantSlug()
  if (tenantSlug) {
    const { data: org } = await supabase.from('organizations').select('id').eq('slug', tenantSlug).maybeSingle()
    if (org?.id) {
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('organization_id', org.id)
        .limit(1)
        .maybeSingle()

      // Only tenant admins should be forced into the setup wizard.
      // Otherwise, non-admin members can get stuck in a redirect loop:
      // /dashboard -> /onboarding/setup -> /dashboard ...
      if (!project?.id && role === 'tenant_admin') {
        redirect('/onboarding/setup')
      }
    }
  }

  let sidebarProjects: { id: string; name: string }[] = []
  let organizationTheme = undefined

  if (ws.organizationId) {
    sidebarProjects = await loadSidebarProjects(supabase as any, {
      organizationId: ws.organizationId,
      userId: user.id,
      role,
    })

    const { data: orgData } = await supabase
      .from('organizations')
      .select(ORGANIZATION_THEME_COLUMNS)
      .eq('id', ws.organizationId)
      .single()

    organizationTheme = buildOrganizationTheme(orgData)
  }

  return (
    <ThemeProvider organizationTheme={organizationTheme}>
      <DashboardLayout role={role} sidebarProjects={sidebarProjects} memberProjectIds={memberProjectIds}>
        {children}
      </DashboardLayout>
    </ThemeProvider>
  )
}

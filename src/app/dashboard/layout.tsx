import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { ThemeProvider, type OrganizationTheme } from '@/components/theme/theme-provider'
import type { UserRole } from '@/types'
import { getTenantSlug } from '@/lib/tenant/server'
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
  let organizationTheme: Partial<OrganizationTheme> | undefined = undefined

  if (ws.organizationId) {
    const { data: projectRows } = await supabase
      .from('projects')
      .select('id,name')
      .eq('organization_id', ws.organizationId)
      .order('created_at', { ascending: false })
      .limit(4)
    sidebarProjects = projectRows ?? []

    // Fetch organization theme
    const { data: orgData } = await supabase
      .from('organizations')
      .select('theme_preset, primary_color, secondary_color, accent_color')
      .eq('id', ws.organizationId)
      .single()

    if (orgData) {
      organizationTheme = {
        preset: orgData.theme_preset || 'default',
        colors: {
          primary: orgData.primary_color || '#3B82F6',
          secondary: orgData.secondary_color || '#64748B',
          accent: orgData.accent_color || '#10B981',
        },
      }
    }
  }

  return (
    <ThemeProvider organizationTheme={organizationTheme}>
      <DashboardLayout role={role} sidebarProjects={sidebarProjects}>
        {children}
      </DashboardLayout>
    </ThemeProvider>
  )
}


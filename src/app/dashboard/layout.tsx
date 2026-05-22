import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCachedUser, getCachedProfile, getCachedOrgInfo } from '@/lib/supabase/cached'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { buildOrganizationTheme, ORGANIZATION_THEME_COLUMNS } from '@/lib/theme/load-organization-theme'
import type { UserRole } from '@/types'
import { resolveWorkspaceContext } from '@/lib/auth/resolve-workspace-role'

export default async function DashboardRouteLayout({ children }: { children: ReactNode }) {
  const supabase = createClient()

  // Use cached getUser — shared across middleware, layout, and page
  const { user } = await getCachedUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Use cached profile and workspace context — also used by child pages
  const [profile, ws] = await Promise.all([
    getCachedProfile(user.id),
    resolveWorkspaceContext({ supabase: supabase as any, userId: user.id }),
  ])

  const role = ws.role as UserRole

  // Redirect super admins to their dashboard (global role).
  if (profile?.role === 'super_admin') {
    redirect('/super-admin/dashboard')
  }

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
  let orgInfo: { name: string | null; icon: string | null } = { name: null, icon: null }

  if (ws.organizationId) {
    // Run sidebar projects, theme, and org info in parallel
    const [projectRows, orgThemeData, cachedOrgInfo] = await Promise.all([
      supabase
        .from('projects')
        .select('id,name')
        .eq('organization_id', ws.organizationId)
        .order('created_at', { ascending: false })
        .limit(4)
        .then((r) => r.data),
      supabase
        .from('organizations')
        .select(ORGANIZATION_THEME_COLUMNS)
        .eq('id', ws.organizationId)
        .single()
        .then((r) => r.data),
      getCachedOrgInfo(ws.organizationId),
    ])

    sidebarProjects = projectRows ?? []
    organizationTheme = buildOrganizationTheme(orgThemeData)
    orgInfo = {
      name: cachedOrgInfo?.name ?? null,
      icon: cachedOrgInfo?.icon_url ?? null,
    }
  }

  // Pass user info and org info down so header/sidebar skip client-side fetches
  const userInfo = {
    fullName: profile?.full_name || user.email?.split('@')[0] || 'User',
    email: user.email || 'No email',
    avatarUrl: profile?.avatar_url || null,
  }

  return (
    <ThemeProvider organizationTheme={organizationTheme}>
      <DashboardLayout
        role={role}
        sidebarProjects={sidebarProjects}
        userInfo={userInfo}
        organizationName={orgInfo.name}
        organizationIcon={orgInfo.icon}
      >
        {children}
      </DashboardLayout>
    </ThemeProvider>
  )
}


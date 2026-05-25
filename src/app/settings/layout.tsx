import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCachedUser, getCachedProfile, getCachedOrgInfo } from '@/lib/supabase/cached'
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

  const { user } = await getCachedUser()

  if (!user) {
    redirect('/auth/login')
  }

  const [profile, ws] = await Promise.all([
    getCachedProfile(user.id),
    resolveWorkspaceContext({ supabase: supabase as any, userId: user.id }),
  ])

  const role = ws.role as UserRole

  if (profile?.role === 'super_admin') {
    redirect('/super-admin/dashboard')
  }

  let memberProjectIds: string[] = []
  if (role === 'team_member') {
    memberProjectIds = await loadMemberProjectIds(supabase as any, user.id)
  }

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

      if (!project?.id && role === 'tenant_admin') {
        redirect('/onboarding/setup')
      }
    }
  }

  let sidebarProjects: { id: string; name: string }[] = []
  let organizationTheme = undefined
  let orgInfo: { name: string | null; icon: string | null } = { name: null, icon: null }

  if (ws.organizationId) {
    const [sidebarProjectsResult, orgThemeData, cachedOrgInfo] = await Promise.all([
      loadSidebarProjects(supabase as any, {
        organizationId: ws.organizationId,
        userId: user.id,
        role,
      }),
      supabase
        .from('organizations')
        .select(ORGANIZATION_THEME_COLUMNS)
        .eq('id', ws.organizationId)
        .single()
        .then((r) => r.data),
      getCachedOrgInfo(ws.organizationId),
    ])

    sidebarProjects = sidebarProjectsResult
    organizationTheme = buildOrganizationTheme(orgThemeData)
    orgInfo = {
      name: cachedOrgInfo?.name ?? null,
      icon: cachedOrgInfo?.icon_url ?? null,
    }
  }

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
        memberProjectIds={memberProjectIds}
        userInfo={userInfo}
        organizationName={orgInfo.name}
        organizationIcon={orgInfo.icon}
      >
        {children}
      </DashboardLayout>
    </ThemeProvider>
  )
}

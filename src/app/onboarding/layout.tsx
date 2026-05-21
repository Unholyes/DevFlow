import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import {
  buildOrganizationTheme,
  ORGANIZATION_THEME_COLUMNS,
} from '@/lib/theme/load-organization-theme'

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  let organizationTheme = undefined
  const tenantSlug = getTenantSlug()
  let orgId: string | null = null

  if (tenantSlug) {
    const { data: org } = await supabase.from('organizations').select('id').eq('slug', tenantSlug).maybeSingle()
    orgId = org?.id ?? null
  } else {
    orgId = await resolvePrimaryOrgIdForUser(supabase as any, user.id)
  }

  if (orgId) {
    const { data: orgData } = await supabase
      .from('organizations')
      .select(ORGANIZATION_THEME_COLUMNS)
      .eq('id', orgId)
      .single()

    organizationTheme = buildOrganizationTheme(orgData)
  }

  return (
    <ThemeProvider organizationTheme={organizationTheme}>
      <div className="min-h-screen bg-[var(--theme-background)] text-[var(--theme-foreground)]">{children}</div>
    </ThemeProvider>
  )
}

import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import type { UserRole } from '@/types'
import { getTenantSlug } from '@/lib/tenant/server'

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

  const role = (profile?.role ?? 'team_member') as UserRole

  // Redirect super admins to their dashboard
  if (role === 'super_admin') {
    redirect('/super-admin/dashboard')
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

  return <DashboardLayout role={role}>{children}</DashboardLayout>
}


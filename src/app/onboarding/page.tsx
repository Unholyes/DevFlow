import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingPageContent } from '@/components/onboarding/onboarding-page-content'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'

export default async function OnboardingPage() {
  const supabase = createClient()
  const tenantSlug = getTenantSlug()

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

  if (profile?.role === 'super_admin') {
    redirect('/super-admin/dashboard')
  }

  if (profile?.role === 'tenant_admin') {
    const orgId = await resolvePrimaryOrgIdForUser(supabase as any, user.id)
    if (orgId) {
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('organization_id', orgId)
        .limit(1)
        .maybeSingle()

      if (!project?.id) {
        redirect('/onboarding/setup')
      }
    }

    if (tenantSlug) {
      redirect('/dashboard')
    }

    if (orgId) {
      redirect('/dashboard')
    }
  }

  return <OnboardingPageContent />
}


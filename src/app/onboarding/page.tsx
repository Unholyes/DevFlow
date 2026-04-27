import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingPageContent } from '@/components/onboarding/onboarding-page-content'
import { getTenantSlug } from '@/lib/tenant/server'

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

  // If the user is already a tenant admin AND they're on a tenant subdomain,
  // send them to the dashboard. On the base domain, keep them on /onboarding
  // to avoid a redirect loop (/dashboard -> /onboarding enforced by middleware).
  if (profile?.role === 'tenant_admin' && tenantSlug) {
    redirect('/dashboard')
  }

  return <OnboardingPageContent />
}


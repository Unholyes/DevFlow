import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { SetupWizard } from '@/components/onboarding/setup-wizard'

export default async function OnboardingSetupPage() {
  const tenantSlug = getTenantSlug()
  if (!tenantSlug) redirect('/onboarding')

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: org } = await supabase.from('organizations').select('id').eq('slug', tenantSlug).maybeSingle()
  if (!org?.id) notFound()

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!profile) redirect('/dashboard')

  // Wizard is meant for tenant admins (MVP).
  if (profile.role !== 'tenant_admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white border border-gray-200 rounded-lg p-6">
          <h1 className="text-xl font-semibold text-gray-900">Setup requires a tenant admin</h1>
          <p className="mt-2 text-sm text-gray-600">
            Your account is a team member. Ask your tenant admin to complete the initial setup wizard for this
            workspace.
          </p>
          <div className="mt-4">
            <a
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Go to dashboard
            </a>
          </div>
        </div>
      </div>
    )
  }

  // If they already have a project, onboarding setup is done.
  const { data: existingProject } = await supabase
    .from('projects')
    .select('id')
    .eq('organization_id', org.id)
    .limit(1)
    .maybeSingle()

  if (existingProject?.id) {
    redirect(`/dashboard/projects/${existingProject.id}`)
  }

  return <SetupWizard tenantSlug={tenantSlug} />
}


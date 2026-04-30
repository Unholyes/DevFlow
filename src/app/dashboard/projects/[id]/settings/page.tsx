import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import { ProjectSettingsForm } from '@/components/project/project-settings-form'

export default async function ProjectSettingsPage({ params }: { params: { id: string } }) {
  const tenantSlug = getTenantSlug()
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const orgId = tenantSlug
    ? (
        await supabase
          .from('organizations')
          .select('id')
          .eq('slug', tenantSlug)
          .maybeSingle()
      ).data?.id ?? null
    : await resolvePrimaryOrgIdForUser(supabase as any, user.id)

  if (!orgId) redirect('/onboarding')

  let project:
    | {
        id: string
        name: string
        description: string | null
        status: 'active' | 'completed' | 'archived'
        phase_gating_enabled?: boolean | null
      }
    | null = null

  {
    const attempt = await supabase
      .from('projects')
      .select('id,name,description,status,phase_gating_enabled')
      .eq('organization_id', orgId)
      .eq('id', params.id)
      .maybeSingle()

    if (attempt.error?.code === 'PGRST204') {
      const fallback = await supabase
        .from('projects')
        .select('id,name,description,status')
        .eq('organization_id', orgId)
        .eq('id', params.id)
        .maybeSingle()
      project = fallback.data as any
    } else {
      project = attempt.data as any
    }
  }

  if (!project) notFound()

  return (
    <ProjectSettingsForm
      project={{
        id: project.id,
        name: project.name,
        description: project.description ?? '',
        status: project.status,
        phaseGatingEnabled: !!project.phase_gating_enabled,
      }}
    />
  )
}

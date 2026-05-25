import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import { ProjectSettingsForm } from '@/components/project/project-settings-form'
import { loadProjectForSettings } from '@/lib/projects/load-project-for-settings'
import { userCanManageProjectSettings } from '@/lib/permissions/project-settings-permissions'

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

  const project = await loadProjectForSettings(supabase, orgId, params.id)
  if (!project) notFound()

  const canManageSettings = await userCanManageProjectSettings(supabase, {
    organizationId: orgId,
    userId: user.id,
    projectId: project.id,
  })

  if (!canManageSettings) {
    redirect(`/dashboard/projects/${project.id}`)
  }

  return (
    <ProjectSettingsForm
      project={{
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        phaseGatingEnabled: project.phaseGatingEnabled,
        dueDate: project.dueDate,
      }}
    />
  )
}

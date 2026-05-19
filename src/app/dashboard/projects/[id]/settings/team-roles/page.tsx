import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import { ProjectTeamRolesSettings } from '@/components/project/project-team-roles-settings'
import { loadProjectForSettings } from '@/lib/projects/load-project-for-settings'
import { userCanManageProjectMembers } from '@/lib/permissions/project-members-permissions'

export default async function ProjectTeamRolesSettingsPage({ params }: { params: { id: string } }) {
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

  const canEdit = await userCanManageProjectMembers(supabase, {
    organizationId: project.organizationId,
    userId: user.id,
    projectId: project.id,
  })

  return <ProjectTeamRolesSettings projectId={project.id} canEdit={canEdit} />
}

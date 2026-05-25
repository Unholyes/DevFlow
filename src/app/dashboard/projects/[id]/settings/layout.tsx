import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import { loadProjectForSettings } from '@/lib/projects/load-project-for-settings'
import { userCanManageProjectSettings } from '@/lib/permissions/project-settings-permissions'

export default async function ProjectSettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
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
    <div className="mx-auto w-full max-w-3xl px-6 py-6">
      <div className="mb-6">
        <Link href={`/dashboard/projects/${project.id}`} className="text-sm font-medium text-gray-600 hover:text-blue-600">
          Back to project
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">Project settings</h1>
        <p className="mt-1 text-sm text-gray-500">{project.name}</p>
      </div>
      <div>{children}</div>
    </div>
  )
}

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { SprintsPageClient, type SprintWithStats } from '@/components/sprints/sprints-page-client'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'

export default async function SprintsPage({
  params,
  searchParams,
}: {
  params: { id: string; phaseId: string }
  searchParams?: { process?: string; method?: string }
}) {
  const tenantSlug = getTenantSlug()
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const orgId = tenantSlug
    ? (await supabase.from('organizations').select('id').eq('slug', tenantSlug).maybeSingle()).data?.id ?? null
    : await resolvePrimaryOrgIdForUser(supabase as any, user.id)

  if (!orgId) redirect('/onboarding')

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', params.id)
    .eq('organization_id', orgId)
    .maybeSingle()
  if (!project) notFound()

  const { data: phase } = await supabase
    .from('sdlc_phases')
    .select('id')
    .eq('id', params.phaseId)
    .eq('project_id', project.id)
    .maybeSingle()
  if (!phase) notFound()

  const selectedProcessName =
    typeof searchParams?.process === 'string' && searchParams.process.trim().length > 0
      ? decodeURIComponent(searchParams.process)
      : null
  const selectedMethod =
    typeof searchParams?.method === 'string' && searchParams.method.trim().length > 0
      ? decodeURIComponent(searchParams.method)
      : null

  // Back-compat: resolve process by name/method and redirect to process-scoped route.
  const { data: processes } = await supabase
    .from('phase_processes')
    .select('id,name,methodology,order_index')
    .eq('phase_id', phase.id)
    .order('order_index', { ascending: true })

  const process =
    selectedProcessName
      ? (processes ?? []).find(
          (p) => p.name === selectedProcessName && (selectedMethod ? p.methodology === selectedMethod : true)
        ) ?? (processes ?? []).find((p) => p.name === selectedProcessName)
      : (processes ?? [])[0] ?? null

  if (process?.id) {
    return redirect(
      `/dashboard/projects/${params.id}/phases/${params.phaseId}/processes/${process.id}/sprints`
    )
  }

  return (
    <SprintsPageClient
      projectId={project.id}
      phaseId={phase.id}
      sprints={[] as SprintWithStats[]}
      selectedProcessName={selectedProcessName}
      selectedMethod={selectedMethod}
    />
  )
}

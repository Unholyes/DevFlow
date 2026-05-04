import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'

export default async function PhaseBoardPage({
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
    ? (
        await supabase
          .from('organizations')
          .select('id')
          .eq('slug', tenantSlug)
          .maybeSingle()
      ).data?.id ?? null
    : await resolvePrimaryOrgIdForUser(supabase as any, user.id)

  if (!orgId) redirect('/onboarding')

  const { data: project } = await supabase
    .from('projects')
    .select('id,phase_gating_enabled')
    .eq('id', params.id)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (!project) notFound()

  const { data: phases } = await supabase
    .from('sdlc_phases')
    .select('id,methodology,status,order_index,is_gated')
    .eq('project_id', project.id)
    .order('order_index', { ascending: true })

  const phase = (phases ?? []).find((p) => p.id === params.phaseId)
  if (!phase) notFound()

  const attempt = await supabase
    .from('phase_processes')
    .select('id,name,methodology,order_index')
    .eq('phase_id', phase.id)
    .order('order_index', { ascending: true })

  const processes =
    attempt.error?.code === 'PGRST204' ? ([] as any[]) : ((attempt.data as any[]) ?? [])

  const phaseIndex = (phases ?? []).findIndex((p) => p.id === phase.id)
  const prev = phaseIndex > 0 ? (phases ?? [])[phaseIndex - 1] : null

  const isLocked =
    project.phase_gating_enabled && phase.is_gated && phaseIndex > 0 && prev?.status !== 'completed'

  if (isLocked) {
    return redirect(`/dashboard/projects/${params.id}/phases/${params.phaseId}`)
  }

  const selectedProcessName =
    typeof searchParams?.process === 'string' && searchParams.process.trim().length > 0
      ? decodeURIComponent(searchParams.process)
      : null
  const selectedMethod =
    typeof searchParams?.method === 'string' && searchParams.method.trim().length > 0
      ? decodeURIComponent(searchParams.method)
      : null

  const resolvedProcess =
    selectedProcessName
      ? (processes ?? []).find(
          (p) =>
            p.name === selectedProcessName && (selectedMethod ? p.methodology === selectedMethod : true)
        ) ?? (processes ?? []).find((p) => p.name === selectedProcessName)
      : (processes ?? [])[0] ?? null

  if (!resolvedProcess?.id) {
    return redirect(`/dashboard/projects/${params.id}/phases/${params.phaseId}`)
  }

  return redirect(
    resolvedProcess.methodology === 'scrum'
      ? `/dashboard/projects/${params.id}/phases/${params.phaseId}/processes/${resolvedProcess.id}/sprints`
      : `/dashboard/projects/${params.id}/phases/${params.phaseId}/processes/${resolvedProcess.id}/board`
  )
}

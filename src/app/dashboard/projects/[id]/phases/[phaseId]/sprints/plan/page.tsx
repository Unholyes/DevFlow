import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { SprintPlanningPageClient } from '@/components/sprints/sprint-planning-page-client'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'

export default async function SprintPlanningPage({
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
    return redirect(`/dashboard/projects/${params.id}/phases/${params.phaseId}/processes/${process.id}/sprints/plan`)
  }

  const { data: backlogStage } = await supabase
    .from('workflow_stages')
    .select('id')
    .eq('phase_id', phase.id)
    .eq('is_backlog', true)
    .order('stage_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!backlogStage?.id) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Backlog not configured</h2>
        <p className="text-sm text-gray-600">
          This Scrum phase does not have a workflow stage marked as backlog (`is_backlog = true`). Create a backlog
          column/stage for this phase to plan sprints.
        </p>
      </div>
    )
  }

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id,title,description,priority,story_points,assignee_id,position')
    .eq('project_id', project.id)
    .eq('workflow_stage_id', backlogStage.id)
    .is('sprint_id', null)
    .order('position', { ascending: true })

  return <SprintPlanningPageClient projectId={project.id} phaseId={phase.id} backlogTasks={(tasks ?? []) as any} />
}

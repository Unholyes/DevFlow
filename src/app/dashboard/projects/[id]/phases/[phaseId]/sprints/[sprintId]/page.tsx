import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { SprintDetailsPageClient } from '@/components/sprints/sprint-details-page-client'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'

export default async function SprintDetailsPage({
  params,
}: {
  params: { id: string; phaseId: string; sprintId: string }
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

  const { data: sprint } = await supabase
    .from('sprints')
    .select('id,name,start_date,end_date,status,story_points_total,process_id')
    .eq('id', params.sprintId)
    .eq('project_id', project.id)
    .eq('phase_id', phase.id)
    .eq('organization_id', orgId)
    .maybeSingle()
  if (!sprint) notFound()

  // Back-compat: redirect to process-scoped sprint details if process_id is present.
  if ((sprint as any).process_id) {
    return redirect(
      `/dashboard/projects/${params.id}/phases/${params.phaseId}/processes/${(sprint as any).process_id}/sprints/${sprint.id}`
    )
  }

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id,title,description,priority,story_points,completed_at,position')
    .eq('project_id', project.id)
    .eq('organization_id', orgId)
    .eq('sprint_id', sprint.id)
    .order('position', { ascending: true })

  return (
    <SprintDetailsPageClient
      projectId={project.id}
      phaseId={phase.id}
      sprint={sprint as any}
      tasks={(tasks ?? []) as any}
    />
  )
}


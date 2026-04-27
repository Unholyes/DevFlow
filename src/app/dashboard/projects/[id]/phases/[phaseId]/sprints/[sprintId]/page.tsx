import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { SprintDetailsPageClient } from '@/components/sprints/sprint-details-page-client'

export default async function SprintDetailsPage({
  params,
}: {
  params: { id: string; phaseId: string; sprintId: string }
}) {
  const tenantSlug = getTenantSlug()
  if (!tenantSlug) redirect('/onboarding')

  const supabase = createClient()

  const { data: org } = await supabase.from('organizations').select('id').eq('slug', tenantSlug).maybeSingle()
  if (!org?.id) redirect('/onboarding')

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', params.id)
    .eq('organization_id', org.id)
    .maybeSingle()
  if (!project) notFound()

  const { data: phase } = await supabase
    .from('sdlc_phases')
    .select('id,methodology')
    .eq('id', params.phaseId)
    .eq('project_id', project.id)
    .maybeSingle()
  if (!phase) notFound()
  if (phase.methodology !== 'scrum') redirect(`/dashboard/projects/${params.id}/phases/${params.phaseId}`)

  const { data: sprint } = await supabase
    .from('sprints')
    .select('id,name,start_date,end_date,status,story_points_total')
    .eq('id', params.sprintId)
    .eq('project_id', project.id)
    .eq('phase_id', phase.id)
    .eq('organization_id', org.id)
    .maybeSingle()
  if (!sprint) notFound()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id,title,description,priority,story_points,completed_at,position')
    .eq('project_id', project.id)
    .eq('organization_id', org.id)
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


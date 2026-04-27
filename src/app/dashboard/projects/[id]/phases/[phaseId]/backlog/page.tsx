import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { ProductBacklogPageClient } from '@/components/backlog/product-backlog-page-client'

export default async function ProductBacklogPage({ params }: { params: { id: string; phaseId: string } }) {
  const tenantSlug = getTenantSlug()
  if (!tenantSlug) redirect('/onboarding')

  const supabase = createClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', tenantSlug)
    .maybeSingle()

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
    .select('id,title,methodology')
    .eq('id', params.phaseId)
    .eq('project_id', project.id)
    .maybeSingle()

  if (!phase) notFound()

  if (phase.methodology !== 'scrum') {
    return redirect(`/dashboard/projects/${params.id}/phases/${params.phaseId}`)
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
          column/stage for this phase to use the Product Backlog.
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

  return (
    <ProductBacklogPageClient
      projectId={project.id}
      phaseId={phase.id}
      phaseTitle={phase.title}
      tasks={(tasks ?? []) as any}
    />
  )
}

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import ScrumView from '@/components/project/ScrumView'
import KanbanView from '@/components/project/KanbanView'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'

export default async function PhaseBoardPage({ params }: { params: { id: string; phaseId: string } }) {
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
    .select('id,phase_gating_enabled')
    .eq('id', params.id)
    .eq('organization_id', org.id)
    .maybeSingle()

  if (!project) notFound()

  const { data: phases } = await supabase
    .from('sdlc_phases')
    .select('id,methodology,status,order_index,is_gated')
    .eq('project_id', project.id)
    .order('order_index', { ascending: true })

  const phase = (phases ?? []).find((p) => p.id === params.phaseId)
  if (!phase) notFound()

  const phaseIndex = (phases ?? []).findIndex((p) => p.id === phase.id)
  const prev = phaseIndex > 0 ? (phases ?? [])[phaseIndex - 1] : null

  const isLocked =
    project.phase_gating_enabled && phase.is_gated && phaseIndex > 0 && prev?.status !== 'completed'

  if (isLocked) {
    return redirect(`/dashboard/projects/${params.id}/phases/${params.phaseId}`)
  }

  const { data: stages } = await supabase
    .from('workflow_stages')
    .select('id,name,stage_order,is_done,is_backlog')
    .eq('phase_id', phase.id)
    .eq('organization_id', org.id)
    .order('stage_order', { ascending: true })

  const { data: sprint } = await supabase
    .from('sprints')
    .select('id,name,status')
    .eq('project_id', project.id)
    .eq('phase_id', phase.id)
    .eq('organization_id', org.id)
    .in('status', ['active', 'planned'])
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: sprintTasks } = sprint
    ? await supabase
        .from('tasks')
        .select('id,title,priority,story_points,workflow_stage_id,completed_at,position')
        .eq('project_id', project.id)
        .eq('organization_id', org.id)
        .eq('sprint_id', sprint.id)
        .order('position', { ascending: true })
    : { data: [] as any[] }

  const stageIds = (stages ?? []).map((s) => s.id)
  const { data: kanbanTasks } =
    stageIds.length > 0
      ? await supabase
          .from('tasks')
          .select('id,title,priority,story_points,workflow_stage_id,completed_at,position')
          .eq('project_id', project.id)
          .eq('organization_id', org.id)
          .in('workflow_stage_id', stageIds)
          .order('position', { ascending: true })
      : { data: [] as any[] }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link 
        href={`/dashboard/projects/${params.id}/phases/${params.phaseId}`}
        className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Phase Overview
      </Link>

      {/* Phase Board (Scrum or Kanban) */}
      {phase.methodology === 'scrum' ? (
        <ScrumView
          projectId={project.id}
          phaseId={phase.id}
          sprint={(sprint as any) ?? null}
          stages={(stages ?? []) as any}
          tasks={(sprintTasks ?? []) as any}
        />
      ) : (
        <KanbanView
          projectId={project.id}
          phaseId={phase.id}
          stages={(stages ?? []) as any}
          tasks={(kanbanTasks ?? []) as any}
        />
      )}
    </div>
  )
}

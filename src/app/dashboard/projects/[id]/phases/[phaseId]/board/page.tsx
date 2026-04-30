import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import ScrumView from '@/components/project/ScrumView'
import KanbanView from '@/components/project/KanbanView'
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

  let processes:
    | {
        name: string
        methodology: 'scrum' | 'kanban' | 'waterfall' | 'devops'
        order_index: number
      }[]
    | null = null

  {
    const attempt = await supabase
      .from('phase_processes')
      .select('name,methodology,order_index')
      .eq('phase_id', phase.id)
      .order('order_index', { ascending: true })

    if (attempt.error?.code === 'PGRST204') {
      processes = []
    } else {
      processes = (attempt.data as any[]) ?? []
    }
  }

  const primaryMethodology = (processes?.[0]?.methodology ?? phase.methodology) as
    | 'scrum'
    | 'kanban'
    | 'waterfall'
    | 'devops'

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

  const { data: stages } = await supabase
    .from('workflow_stages')
    .select('id,name,stage_order,is_done,is_backlog')
    .eq('phase_id', phase.id)
    .eq('organization_id', orgId)
    .order('stage_order', { ascending: true })

  const { data: sprint } = await supabase
    .from('sprints')
    .select('id,name,status')
    .eq('project_id', project.id)
    .eq('phase_id', phase.id)
    .eq('organization_id', orgId)
    .in('status', ['active', 'planned'])
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: sprintTasks } = sprint
    ? await supabase
        .from('tasks')
        .select('id,title,priority,story_points,workflow_stage_id,completed_at,position')
        .eq('project_id', project.id)
        .eq('organization_id', orgId)
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
          .eq('organization_id', orgId)
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

      {processes && processes.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {processes.map((process, index) => (
            <Link
              key={`${process.name}-${index}`}
              href={
                process.methodology === 'scrum'
                  ? `/dashboard/projects/${params.id}/phases/${params.phaseId}/sprints`
                  : `/dashboard/projects/${params.id}/phases/${params.phaseId}/board`
              }
              className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700"
            >
              {process.name} ({process.methodology})
            </Link>
          ))}
        </div>
      ) : null}

      {selectedProcessName ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-blue-700">Active process</p>
          <p className="mt-1 text-sm font-semibold text-blue-900">
            {selectedProcessName} {selectedMethod ? `(${selectedMethod})` : ''}
          </p>
        </div>
      ) : null}

      {/* Phase Board (driven by primary process method) */}
      {primaryMethodology === 'scrum' ? (
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

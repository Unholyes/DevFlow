import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import KanbanView from '@/components/project/KanbanView'
import ScrumView from '@/components/project/ScrumView'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'

export default async function ProcessBoardPage({
  params,
  searchParams,
}: {
  params: { id: string; phaseId: string; processId: string }
  searchParams?: { sprintId?: string }
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
    .select('id,phase_gating_enabled')
    .eq('id', params.id)
    .eq('organization_id', orgId)
    .maybeSingle()
  if (!project) notFound()

  const { data: phases } = await supabase
    .from('sdlc_phases')
    .select('id,status,order_index,is_gated')
    .eq('project_id', project.id)
    .order('order_index', { ascending: true })

  const phase = (phases ?? []).find((p) => p.id === params.phaseId)
  if (!phase) notFound()

  const phaseIndex = (phases ?? []).findIndex((p) => p.id === phase.id)
  const prev = phaseIndex > 0 ? (phases ?? [])[phaseIndex - 1] : null
  const isLocked =
    project.phase_gating_enabled && (phase as any).is_gated && phaseIndex > 0 && (prev as any)?.status !== 'completed'

  if (isLocked) {
    return redirect(`/dashboard/projects/${params.id}/phases/${params.phaseId}`)
  }

  const { data: process } = await supabase
    .from('phase_processes')
    .select('id,name,methodology')
    .eq('id', params.processId)
    .eq('phase_id', phase.id)
    .eq('organization_id', orgId)
    .maybeSingle()
  if (!process) notFound()

  const { data: allProcesses } = await supabase
    .from('phase_processes')
    .select('id,name,methodology,order_index')
    .eq('phase_id', phase.id)
    .order('order_index', { ascending: true })

  const { data: stages } = await supabase
    .from('workflow_stages')
    .select('id,name,stage_order,is_done,is_backlog,wip_limit')
    .eq('phase_id', phase.id)
    .eq('organization_id', orgId)
    .order('stage_order', { ascending: true })

  const stageIds = (stages ?? []).map((s) => s.id)

  if (process.methodology === 'scrum') {
    const requestedSprintId =
      typeof searchParams?.sprintId === 'string' && searchParams.sprintId.trim().length > 0
        ? searchParams.sprintId.trim()
        : null

    const { data: sprint } = requestedSprintId
      ? await supabase
          .from('sprints')
          .select('id,name,status,start_date')
          .eq('id', requestedSprintId)
          .eq('project_id', project.id)
          .eq('phase_id', phase.id)
          .eq('organization_id', orgId)
          .eq('process_id', process.id)
          .maybeSingle()
      : await supabase
          .from('sprints')
          .select('id,name,status,start_date')
          .eq('project_id', project.id)
          .eq('phase_id', phase.id)
          .eq('organization_id', orgId)
          .eq('process_id', process.id)
          .in('status', ['active', 'planned', 'closed'])
          .order('start_date', { ascending: false })
          .limit(1)
          .maybeSingle()

    const sprintRow = (sprint as any) ?? null

    const { data: sprintTasks } =
      sprintRow?.id && stageIds.length > 0
        ? await supabase
            .from('tasks')
            .select('id,title,priority,story_points,workflow_stage_id,completed_at,position')
            .eq('project_id', project.id)
            .eq('organization_id', orgId)
            .eq('process_id', process.id)
            .eq('sprint_id', sprintRow.id)
            .in('workflow_stage_id', stageIds)
            .order('position', { ascending: true })
        : { data: [] as any[] }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/dashboard/projects/${params.id}/phases/${params.phaseId}`}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Phase Overview
          </Link>
          <div className="text-xs text-gray-500">
            Process: <span className="font-semibold text-gray-900">{process.name}</span>
          </div>
        </div>

        {(allProcesses ?? []).length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {(allProcesses ?? []).map((p) => (
              <Link
                key={p.id}
                href={
                  p.methodology === 'scrum'
                    ? `/dashboard/projects/${params.id}/phases/${params.phaseId}/processes/${p.id}/board`
                    : `/dashboard/projects/${params.id}/phases/${params.phaseId}/processes/${p.id}/board`
                }
                className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs ${
                  p.id === process.id
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-white'
                }`}
              >
                {p.name} ({p.methodology})
              </Link>
            ))}
          </div>
        ) : null}

        <ScrumView
          projectId={project.id}
          phaseId={phase.id}
          processId={process.id}
          sprint={
            sprintRow
              ? ({ id: sprintRow.id, name: sprintRow.name, status: sprintRow.status } as any)
              : null
          }
          stages={(stages ?? []) as any}
          tasks={(sprintTasks ?? []) as any}
        />
      </div>
    )
  }

  const { data: tasks } =
    stageIds.length > 0
      ? await supabase
          .from('tasks')
          .select('id,title,priority,story_points,workflow_stage_id,completed_at,position')
          .eq('project_id', project.id)
          .eq('organization_id', orgId)
          .eq('process_id', process.id)
          .in('workflow_stage_id', stageIds)
          .order('position', { ascending: true })
      : { data: [] as any[] }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/dashboard/projects/${params.id}/phases/${params.phaseId}`}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Phase Overview
        </Link>
        <div className="text-xs text-gray-500">
          Process: <span className="font-semibold text-gray-900">{process.name}</span>
        </div>
      </div>

      {(allProcesses ?? []).length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {(allProcesses ?? []).map((p) => (
            <Link
              key={p.id}
              href={
                p.methodology === 'scrum'
                  ? `/dashboard/projects/${params.id}/phases/${params.phaseId}/processes/${p.id}/board`
                  : `/dashboard/projects/${params.id}/phases/${params.phaseId}/processes/${p.id}/board`
              }
              className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs ${
                p.id === process.id
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-white'
              }`}
            >
              {p.name} ({p.methodology})
            </Link>
          ))}
        </div>
      ) : null}

      <KanbanView projectId={project.id} phaseId={phase.id} stages={(stages ?? []) as any} tasks={(tasks ?? []) as any} />
    </div>
  )
}


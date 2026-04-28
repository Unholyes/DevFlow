import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { CompletePhaseButton } from '@/components/phases/complete-phase-button'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'

export default async function PhasePage({ params }: { params: { id: string; phaseId: string } }) {
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
    .select('id,name,phase_gating_enabled')
    .eq('id', params.id)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (!project) notFound()

  const { data: phases } = await supabase
    .from('sdlc_phases')
    .select('id,title,methodology,status,order_index,is_gated')
    .eq('project_id', project.id)
    .order('order_index', { ascending: true })

  const phase = (phases ?? []).find((p) => p.id === params.phaseId)
  if (!phase) notFound()

  const phaseIndex = (phases ?? []).findIndex((p) => p.id === phase.id)
  const prev = phaseIndex > 0 ? (phases ?? [])[phaseIndex - 1] : null

  const isLocked =
    project.phase_gating_enabled && phase.is_gated && phaseIndex > 0 && prev?.status !== 'completed'

  if (isLocked) {
    return (
      <div className="space-y-6">
        <Link
          href={`/dashboard/projects/${project.id}`}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Back to Project Overview
        </Link>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Phase locked</h2>
          <p className="text-sm text-gray-600">
            This phase is locked because phase gating is enabled. Complete the previous phase first to continue.
          </p>
        </div>
      </div>
    )
  }

  const processLabel = phase.methodology === 'scrum' ? 'Scrum' : 'Kanban'

  if (phase.methodology === 'scrum') {
    const { data: sprints } = await supabase
      .from('sprints')
      .select('id,status')
      .eq('project_id', project.id)
      .eq('phase_id', phase.id)
      .eq('organization_id', orgId)
      .in('status', ['active', 'planned'])
      .limit(1)

    const hasOpenSprint = (sprints ?? []).length > 0
    const canComplete = !hasOpenSprint && phase.status !== 'completed'

    return (
      <div className="space-y-6">
        <div>
          <Link
            href={`/dashboard/projects/${project.id}`}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors mb-4"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Back to Project Overview
          </Link>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-medium text-gray-900">{project.name}</h1>
              <span className="text-gray-400">→</span>
              <h2 className="text-xl font-bold text-blue-600">{phase.title} Phase</h2>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">{processLabel}</span>
            </div>
            <CompletePhaseButton
              phaseId={phase.id}
              disabled={!canComplete}
              reason={
                phase.status === 'completed'
                  ? 'Phase already completed'
                  : hasOpenSprint
                    ? 'Complete/close the active sprint first'
                    : undefined
              }
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Scrum tools</h3>
            <p className="text-sm text-gray-600 mt-1">
              Use backlog, sprints, and the board to run this phase with Scrum.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/dashboard/projects/${project.id}/phases/${phase.id}/backlog`}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Backlog
            </Link>
            <Link
              href={`/dashboard/projects/${project.id}/phases/${phase.id}/sprints`}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Sprints
            </Link>
            <Link
              href={`/dashboard/projects/${project.id}/phases/${phase.id}/board`}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Open board
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Kanban phase
  const { data: stages } = await supabase
    .from('workflow_stages')
    .select('id,is_done')
    .eq('phase_id', phase.id)
    .eq('organization_id', orgId)

  const doneStageIds = new Set((stages ?? []).filter((s) => s.is_done).map((s) => s.id))
  const stageIds = (stages ?? []).map((s) => s.id)

  const { data: tasks } =
    stageIds.length > 0
      ? await supabase
          .from('tasks')
          .select('id,workflow_stage_id')
          .eq('project_id', project.id)
          .eq('organization_id', orgId)
          .in('workflow_stage_id', stageIds)
      : { data: [] as any[] }

  const allDone = (tasks ?? []).every((t) => doneStageIds.has(t.workflow_stage_id))
  const canCompleteKanban = allDone && phase.status !== 'completed'

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/projects/${project.id}`}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Back to Project Overview
        </Link>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-medium text-gray-900">{project.name}</h1>
            <span className="text-gray-400">→</span>
            <h2 className="text-xl font-bold text-blue-600">{phase.title} Phase</h2>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">{processLabel}</span>
          </div>
          <CompletePhaseButton
            phaseId={phase.id}
            disabled={!canCompleteKanban}
            reason={
              phase.status === 'completed'
                ? 'Phase already completed'
                : !allDone
                  ? 'Move all tasks into a done column first'
                  : undefined
            }
          />
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Kanban Board</h3>
        <p className="text-sm text-gray-600 mt-1">
          This phase uses Kanban. Use the board to move tasks across workflow stages (WIP limits apply if configured).
        </p>
        <div className="mt-4">
          <Link
            href={`/dashboard/projects/${project.id}/phases/${phase.id}/board`}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Open Board
          </Link>
        </div>
      </div>
    </div>
  )
}
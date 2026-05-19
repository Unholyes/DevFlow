import type { SupabaseClient } from '@supabase/supabase-js'
import { computePhaseProgressPercent } from '@/lib/projects/compute-phase-progress'
import type { PhaseGatingSnapshot } from '@/lib/projects/phase-gating'

export type ProjectPhasesGatingContext = {
  phaseGatingEnabled: boolean
  phases: PhaseGatingSnapshot[]
}

type DbPhase = {
  id: string
  status: string
  order_index: number
  is_gated?: boolean | null
}

/**
 * Loads ordered phases with timeline progress for gating checks on server routes.
 */
export async function loadProjectPhasesGatingContext(
  supabase: SupabaseClient,
  organizationId: string,
  projectId: string,
  phaseGatingEnabled: boolean
): Promise<ProjectPhasesGatingContext> {
  let phases: DbPhase[] = []

  {
    const attempt = await supabase
      .from('sdlc_phases')
      .select('id,status,order_index,is_gated')
      .eq('project_id', projectId)
      .eq('organization_id', organizationId)
      .order('order_index', { ascending: true })

    if (attempt.error?.code === 'PGRST204') {
      const fallback = await supabase
        .from('sdlc_phases')
        .select('id,status,order_index')
        .eq('project_id', projectId)
        .eq('organization_id', organizationId)
        .order('order_index', { ascending: true })
      phases = (fallback.data as DbPhase[]) ?? []
    } else {
      phases = (attempt.data as DbPhase[]) ?? []
    }
  }

  const phaseIds = phases.map((p) => p.id)
  if (phaseIds.length === 0) {
    return { phaseGatingEnabled, phases: [] }
  }

  const { data: workflowStages } = await supabase
    .from('workflow_stages')
    .select('id,phase_id,is_done')
    .eq('organization_id', organizationId)
    .in('phase_id', phaseIds)

  const stageIdToPhaseId = new Map<string, string>()
  const doneStageIds = new Set<string>()
  for (const s of (workflowStages ?? []) as { id: string; phase_id: string; is_done: boolean }[]) {
    stageIdToPhaseId.set(s.id, s.phase_id)
    if (s.is_done) doneStageIds.add(s.id)
  }

  const stageIds = Array.from(stageIdToPhaseId.keys())
  const { data: tasks } =
    stageIds.length > 0
      ? await supabase
          .from('tasks')
          .select('workflow_stage_id,completed_at,process_id')
          .eq('organization_id', organizationId)
          .eq('project_id', projectId)
          .in('workflow_stage_id', stageIds)
      : { data: [] as { workflow_stage_id: string; completed_at: string | null; process_id: string | null }[] }

  const progressTasks = (tasks ?? []) as {
    workflow_stage_id: string
    completed_at: string | null
    process_id: string | null
  }[]

  let phaseProcesses: { id: string; phase_id: string }[] = []
  {
    const attempt = await supabase.from('phase_processes').select('id,phase_id').in('phase_id', phaseIds)
    if (attempt.error?.code !== 'PGRST204') {
      phaseProcesses = (attempt.data as { id: string; phase_id: string }[]) ?? []
    }
  }

  const snapshots: PhaseGatingSnapshot[] = phases.map((p) => ({
    id: p.id,
    status: p.status as PhaseGatingSnapshot['status'],
    isGated: p.is_gated !== false,
    progress: computePhaseProgressPercent({
      phaseId: p.id,
      phaseStatus: p.status,
      processes: phaseProcesses,
      tasks: progressTasks,
      stageIdToPhaseId,
      doneStageIds,
    }),
  }))

  return { phaseGatingEnabled, phases: snapshots }
}

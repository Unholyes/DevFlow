import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveBacklogStageIdForPhase } from '@/lib/sprints/resolve-backlog-stage-id'

const nowIso = () => new Date().toISOString()

/** Move all tasks on a sprint back to the product backlog stage (not only clear sprint_id). */
export async function releaseSprintTasksToProductBacklog(
  supabase: SupabaseClient,
  params: { organizationId: string; sprintId: string; phaseId: string },
): Promise<void> {
  const backlogStageId = await resolveBacklogStageIdForPhase(
    supabase,
    params.organizationId,
    params.phaseId,
  )

  const base = {
    sprint_id: null,
    updated_at: nowIso(),
  }

  if (backlogStageId) {
    const { error } = await supabase
      .from('tasks')
      .update({
        ...base,
        workflow_stage_id: backlogStageId,
        completed_at: null,
        current_stage_entered_at: nowIso(),
      })
      .eq('sprint_id', params.sprintId)
      .eq('organization_id', params.organizationId)

    if (error) throw error
    return
  }

  const { error } = await supabase
    .from('tasks')
    .update(base)
    .eq('sprint_id', params.sprintId)
    .eq('organization_id', params.organizationId)

  if (error) throw error
}

/**
 * Tasks with no sprint but stuck on a board column — repair so Backlog tab and plan page match.
 */
export async function repairOrphanedProductBacklogTasks(
  supabase: SupabaseClient,
  params: { organizationId: string; phaseId: string; processId: string },
): Promise<void> {
  const backlogStageId = await resolveBacklogStageIdForPhase(
    supabase,
    params.organizationId,
    params.phaseId,
  )
  if (!backlogStageId) return

  const { error } = await supabase
    .from('tasks')
    .update({
      workflow_stage_id: backlogStageId,
      completed_at: null,
      current_stage_entered_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq('organization_id', params.organizationId)
    .eq('process_id', params.processId)
    .is('sprint_id', null)
    .neq('workflow_stage_id', backlogStageId)

  if (error) throw error
}

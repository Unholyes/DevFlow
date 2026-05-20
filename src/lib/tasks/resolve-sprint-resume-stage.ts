import type { SupabaseClient } from '@supabase/supabase-js'

type TaskSprintRow = {
  sprint_id: string | null
  last_sprint_workflow_stage_id: string | null
}

/** Active sprint board columns only (not backlog, not done). */
export async function isResumableWorkflowStage(
  supabase: SupabaseClient,
  orgId: string,
  phaseId: string,
  stageId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('workflow_stages')
    .select('id')
    .eq('id', stageId)
    .eq('organization_id', orgId)
    .eq('phase_id', phaseId)
    .eq('is_backlog', false)
    .eq('is_done', false)
    .maybeSingle()

  if (error) throw error
  return !!data?.id
}

/**
 * When a task re-enters a sprint, prefer the column it was in before the last sprint closed.
 * Falls back to sprintStartStageId (typically "To Do") for new work.
 */
export async function resolveWorkflowStageForSprintAssignment(
  supabase: SupabaseClient,
  orgId: string,
  phaseId: string,
  task: Pick<TaskSprintRow, 'last_sprint_workflow_stage_id'>,
  sprintStartStageId?: string | null,
): Promise<{ workflowStageId: string | null; clearResume: boolean }> {
  const resumeId = task.last_sprint_workflow_stage_id
  if (resumeId && (await isResumableWorkflowStage(supabase, orgId, phaseId, resumeId))) {
    return { workflowStageId: resumeId, clearResume: true }
  }

  if (sprintStartStageId && (await isResumableWorkflowStage(supabase, orgId, phaseId, sprintStartStageId))) {
    return { workflowStageId: sprintStartStageId, clearResume: false }
  }

  return { workflowStageId: null, clearResume: false }
}

export async function loadPhaseIdForSprint(
  supabase: SupabaseClient,
  orgId: string,
  sprintId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('sprints')
    .select('phase_id')
    .eq('id', sprintId)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (error) throw error
  return (data?.phase_id as string | undefined) ?? null
}

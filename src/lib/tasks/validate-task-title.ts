import type { SupabaseClient } from '@supabase/supabase-js'

export const DUPLICATE_TASK_TITLE_IN_PROCESS =
  'A task with this name already exists in this process. Choose a different title.'

export function normalizeTaskTitle(title: unknown): string {
  return String(title ?? '').trim()
}

export async function loadPhaseIdForWorkflowStage(
  supabase: SupabaseClient,
  orgId: string,
  workflowStageId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('workflow_stages')
    .select('phase_id')
    .eq('id', workflowStageId)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (error) throw error
  return (data?.phase_id as string | undefined) ?? null
}

function findDuplicateInRows(
  rows: { id: string; title: string }[] | null | undefined,
  normalized: string,
  excludeTaskId?: string,
): string | null {
  const lower = normalized.toLowerCase()
  const duplicate = (rows ?? []).find(
    (row) =>
      row.id !== excludeTaskId && normalizeTaskTitle(row.title).toLowerCase() === lower,
  )
  return duplicate?.id ?? null
}

/** Phase-scoped fallback when a task has no process_id (legacy phase-only backlog). */
async function findDuplicateTaskTitleInPhase(
  supabase: SupabaseClient,
  orgId: string,
  phaseId: string,
  title: string,
  excludeTaskId?: string,
): Promise<string | null> {
  const normalized = normalizeTaskTitle(title)
  if (!normalized) return null

  const { data: stages, error: stagesError } = await supabase
    .from('workflow_stages')
    .select('id')
    .eq('organization_id', orgId)
    .eq('phase_id', phaseId)

  if (stagesError) throw stagesError

  const stageIds = (stages ?? []).map((s) => s.id)
  if (stageIds.length === 0) return null

  const { data, error } = await supabase
    .from('tasks')
    .select('id, title')
    .eq('organization_id', orgId)
    .in('workflow_stage_id', stageIds)
    .is('process_id', null)

  if (error) throw error
  return findDuplicateInRows(data, normalized, excludeTaskId)
}

/**
 * Case-insensitive title uniqueness within a process backlog/board.
 * Falls back to phase-only tasks when process_id is null.
 */
export async function findDuplicateTaskTitleInProcess(
  supabase: SupabaseClient,
  orgId: string,
  processId: string | null | undefined,
  phaseId: string | null | undefined,
  title: string,
  excludeTaskId?: string,
): Promise<string | null> {
  const normalized = normalizeTaskTitle(title)
  if (!normalized) return null

  if (processId) {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('organization_id', orgId)
      .eq('process_id', processId)

    if (error) throw error
    return findDuplicateInRows(data, normalized, excludeTaskId)
  }

  if (phaseId) {
    return findDuplicateTaskTitleInPhase(supabase, orgId, phaseId, title, excludeTaskId)
  }

  return null
}

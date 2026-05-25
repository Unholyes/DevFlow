import type { SupabaseClient } from '@supabase/supabase-js'

export function isPhaseCompleted(status: string | null | undefined): boolean {
  return String(status ?? '').trim().toLowerCase() === 'completed'
}

export const PHASE_COMPLETED_WORK_MESSAGE =
  'This phase is completed. You cannot add tasks or create new sprints here.'

/** Returns an error message when the phase rejects new work, or null if allowed. */
export async function getPhaseNewWorkBlockReason(
  supabase: SupabaseClient,
  phaseId: string,
): Promise<string | null> {
  const { data: phase, error } = await supabase
    .from('sdlc_phases')
    .select('status')
    .eq('id', phaseId)
    .maybeSingle()

  if (error) throw error
  if (!phase) return 'Phase not found'
  if (isPhaseCompleted((phase as { status?: string }).status)) {
    return PHASE_COMPLETED_WORK_MESSAGE
  }
  return null
}

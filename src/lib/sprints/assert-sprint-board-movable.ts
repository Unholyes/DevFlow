import type { SupabaseClient } from '@supabase/supabase-js'
import { canMoveTasksOnSprintBoard } from '@/lib/sprints/sprint-board-eligibility'

export async function assertSprintAllowsBoardMoves(
  supabase: SupabaseClient,
  params: { organizationId: string; sprintId: string },
): Promise<string | null> {
  const { data: sprint, error } = await supabase
    .from('sprints')
    .select('status,start_date')
    .eq('id', params.sprintId)
    .eq('organization_id', params.organizationId)
    .maybeSingle()

  if (error) throw error
  if (!sprint) return 'Sprint not found'

  if (!canMoveTasksOnSprintBoard(sprint)) {
    return 'Tasks can only be moved on the active sprint board'
  }

  return null
}

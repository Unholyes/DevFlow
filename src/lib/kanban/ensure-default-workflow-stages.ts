import type { SupabaseClient } from '@supabase/supabase-js'

const DEFAULT_BOARD: [string, boolean][] = [
  ['To-do', false],
  ['In Progress', false],
  ['In review', false],
  ['Completed', true],
]

type StageRow = { id: string; stage_order: number; is_backlog: boolean }

/**
 * Ensures every Kanban **phase** (shared by all processes in that phase) has:
 * 1. Exactly one logical **backlog** stage (`is_backlog = true`) so the product backlog strip/page work.
 * 2. At least one **board** column (non-backlog), seeding To-do → In review → Completed when missing.
 *
 * Workflow stages are scoped by **phase_id**, not `process_id`, so this runs per phase and fixes all
 * Kanban processes in that phase for that project.
 */
export async function ensureKanbanPhaseWorkflowStructure(
  supabase: SupabaseClient,
  orgId: string,
  phaseId: string
): Promise<void> {
  const { data: rows, error: loadErr } = await supabase
    .from('workflow_stages')
    .select('id,stage_order,is_backlog')
    .eq('phase_id', phaseId)
    .eq('organization_id', orgId)
    .order('stage_order', { ascending: true })

  if (loadErr) throw loadErr

  const list = (rows ?? []) as StageRow[]
  const hasBacklog = list.some((s) => s.is_backlog)
  const boardStages = list.filter((s) => !s.is_backlog)

  if (list.length === 0) {
    let order = 0
    const inserts: Array<{
      organization_id: string
      phase_id: string
      name: string
      stage_order: number
      is_done: boolean
      is_backlog: boolean
      wip_limit: null
    }> = [
      {
        organization_id: orgId,
        phase_id: phaseId,
        name: 'Backlog',
        stage_order: order++,
        is_done: false,
        is_backlog: true,
        wip_limit: null,
      },
    ]
    for (const [name, isDone] of DEFAULT_BOARD) {
      inserts.push({
        organization_id: orgId,
        phase_id: phaseId,
        name,
        stage_order: order++,
        is_done: isDone,
        is_backlog: false,
        wip_limit: null,
      })
    }
    const { error: insErr } = await supabase.from('workflow_stages').insert(inserts)
    if (insErr) throw insErr
    return
  }

  if (!hasBacklog) {
    const sorted = [...list].sort((a, b) => b.stage_order - a.stage_order)
    for (const row of sorted) {
      const { error: upErr } = await supabase
        .from('workflow_stages')
        .update({ stage_order: row.stage_order + 1 })
        .eq('id', row.id)
        .eq('organization_id', orgId)
      if (upErr) throw upErr
    }
    const { error: insErr } = await supabase.from('workflow_stages').insert({
      organization_id: orgId,
      phase_id: phaseId,
      name: 'Backlog',
      stage_order: 0,
      is_done: false,
      is_backlog: true,
      wip_limit: null,
    })
    if (insErr) throw insErr
  }

  const { data: afterBacklog } = await supabase
    .from('workflow_stages')
    .select('id,stage_order,is_backlog')
    .eq('phase_id', phaseId)
    .eq('organization_id', orgId)
    .order('stage_order', { ascending: true })

  const boardCount = (afterBacklog ?? []).filter((s) => !s.is_backlog).length
  if (boardCount > 0) return

  const maxOrder = Math.max(0, ...(afterBacklog ?? []).map((s) => s.stage_order ?? 0))
  let order = maxOrder + 1
  const inserts = DEFAULT_BOARD.map(([name, isDone]) => ({
    organization_id: orgId,
    phase_id: phaseId,
    name,
    stage_order: order++,
    is_done: isDone,
    is_backlog: false,
    wip_limit: null as null,
  }))
  const { error: insErr } = await supabase.from('workflow_stages').insert(inserts)
  if (insErr) throw insErr
}

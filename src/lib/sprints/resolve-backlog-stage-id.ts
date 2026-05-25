import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Resolves (and if needed creates) the product backlog workflow stage for a phase.
 * Matches logic used by the Backlog tab and sprint plan page.
 */
export async function resolveBacklogStageIdForPhase(
  supabase: SupabaseClient,
  organizationId: string,
  phaseId: string,
): Promise<string | null> {
  const { data: existingBacklog } = await supabase
    .from('workflow_stages')
    .select('id')
    .eq('phase_id', phaseId)
    .eq('organization_id', organizationId)
    .eq('is_backlog', true)
    .order('stage_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existingBacklog?.id) return existingBacklog.id as string

  const { data: backlogByName } = await supabase
    .from('workflow_stages')
    .select('id')
    .eq('phase_id', phaseId)
    .eq('organization_id', organizationId)
    .ilike('name', '%backlog%')
    .order('stage_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (backlogByName?.id) {
    await supabase
      .from('workflow_stages')
      .update({ is_backlog: false })
      .eq('phase_id', phaseId)
      .eq('organization_id', organizationId)

    await supabase
      .from('workflow_stages')
      .update({ is_backlog: true, is_done: false })
      .eq('id', backlogByName.id)
      .eq('organization_id', organizationId)

    return backlogByName.id as string
  }

  const { data: stages } = await supabase
    .from('workflow_stages')
    .select('id,stage_order')
    .eq('phase_id', phaseId)
    .eq('organization_id', organizationId)
    .order('stage_order', { ascending: true })

  if ((stages ?? []).length > 0) {
    const sorted = [...(stages ?? [])].sort(
      (a, b) => Number((a as { stage_order?: number }).stage_order ?? 0) - Number((b as { stage_order?: number }).stage_order ?? 0),
    )
    for (let i = sorted.length - 1; i >= 0; i--) {
      const s = sorted[i] as { id: string; stage_order?: number }
      await supabase
        .from('workflow_stages')
        .update({ stage_order: Number(s.stage_order ?? 0) + 1, is_backlog: false })
        .eq('id', s.id)
        .eq('organization_id', organizationId)
    }

    const { data: inserted } = await supabase
      .from('workflow_stages')
      .insert({
        organization_id: organizationId,
        phase_id: phaseId,
        name: 'Backlog',
        stage_order: 0,
        is_done: false,
        is_backlog: true,
        wip_limit: null,
      })
      .select('id')
      .single()

    return (inserted as { id?: string } | null)?.id ?? null
  }

  const rows = [
    { name: 'Backlog', stage_order: 0, is_done: false, is_backlog: true, wip_limit: null },
    { name: 'To Do', stage_order: 1, is_done: false, is_backlog: false, wip_limit: null },
    { name: 'In Progress', stage_order: 2, is_done: false, is_backlog: false, wip_limit: null },
    { name: 'Done', stage_order: 3, is_done: true, is_backlog: false, wip_limit: null },
  ].map((s) => ({ ...s, organization_id: organizationId, phase_id: phaseId }))

  const { data: inserted } = await supabase
    .from('workflow_stages')
    .insert(rows)
    .select('id,stage_order')
    .order('stage_order', { ascending: true })

  const backlog = (inserted ?? []).find((r) => Number((r as { stage_order?: number }).stage_order) === 0)
  return (backlog as { id?: string } | undefined)?.id ?? null
}

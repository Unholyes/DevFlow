import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { resolveWorkspaceOrgId } from '@/lib/api/resolve-workspace-org'

/**
 * Reorders non-backlog board columns for a phase. Backlog stages keep a contiguous
 * block of stage_order values before board columns so sort order stays consistent.
 */
export async function POST(request: Request, { params }: { params: { phaseId: string } }) {
  const supabase = createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveWorkspaceOrgId(supabase, request)
    if (!orgId) return NextResponse.json({ error: 'No workspace organization found' }, { status: 400 })

    const { data: phase, error: phaseError } = await supabase
      .from('sdlc_phases')
      .select('id, organization_id')
      .eq('id', params.phaseId)
      .maybeSingle()

    if (phaseError) throw phaseError
    if (!phase || phase.organization_id !== orgId) {
      return NextResponse.json({ error: 'Phase not found' }, { status: 404 })
    }

    const body = (await request.json()) as { orderedStageIds?: string[] }
    if (!Array.isArray(body.orderedStageIds) || body.orderedStageIds.length === 0) {
      return NextResponse.json({ error: 'orderedStageIds is required' }, { status: 400 })
    }

    const { data: fullRows, error: fullErr } = await supabase
      .from('workflow_stages')
      .select('id,is_backlog,stage_order')
      .eq('phase_id', params.phaseId)
      .eq('organization_id', orgId)
      .order('stage_order', { ascending: true })

    if (fullErr) throw fullErr

    const boardFromDb = (fullRows ?? []).filter((r) => !r.is_backlog)
    const boardIdSet = new Set(boardFromDb.map((r) => r.id))

    if (body.orderedStageIds.length !== boardIdSet.size) {
      return NextResponse.json({ error: 'orderedStageIds must list every board column once' }, { status: 400 })
    }
    for (const id of body.orderedStageIds) {
      if (!boardIdSet.has(id)) {
        return NextResponse.json({ error: 'Invalid or foreign stage id in orderedStageIds' }, { status: 400 })
      }
    }

    const backlogOrdered = (fullRows ?? [])
      .filter((r) => r.is_backlog)
      .sort((a, b) => (a.stage_order ?? 0) - (b.stage_order ?? 0))

    let order = 0
    const updates: { id: string; stage_order: number }[] = []

    for (const s of backlogOrdered) {
      updates.push({ id: s.id, stage_order: order++ })
    }
    for (const id of body.orderedStageIds) {
      updates.push({ id, stage_order: order++ })
    }

    // Unique (phase_id, stage_order): parallel updates to 0..n-1 collide mid-flight.
    // Move everyone to a temp band first, then apply final orders (same pattern as DELETE renumber).
    const allIds = (fullRows ?? []).map((r) => r.id)
    const TEMP_BASE = 1_000_000
    for (let i = 0; i < allIds.length; i++) {
      const { error: e1 } = await supabase
        .from('workflow_stages')
        .update({ stage_order: TEMP_BASE + i })
        .eq('id', allIds[i])
        .eq('organization_id', orgId)
      if (e1) throw e1
    }

    for (const u of updates) {
      const { error: e2 } = await supabase
        .from('workflow_stages')
        .update({ stage_order: u.stage_order })
        .eq('id', u.id)
        .eq('organization_id', orgId)
      if (e2) throw e2
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const msg =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: string }).message)
        : 'Failed to reorder columns'
    console.error('POST workflow-stages/reorder:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

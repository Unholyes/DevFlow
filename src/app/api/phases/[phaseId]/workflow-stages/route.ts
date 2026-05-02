import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { resolveWorkspaceOrgId } from '@/lib/api/resolve-workspace-org'

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

    const body = (await request.json()) as { name?: string; wipLimit?: number | null }
    const name = body.name?.trim()
    if (!name) return NextResponse.json({ error: 'Column name is required' }, { status: 400 })

    let wip: number | null = null
    if (body.wipLimit !== undefined && body.wipLimit !== null) {
      const n = typeof body.wipLimit === 'number' ? body.wipLimit : Number(body.wipLimit)
      if (!Number.isFinite(n) || n < 1) {
        return NextResponse.json({ error: 'WIP limit must be a positive number or empty' }, { status: 400 })
      }
      wip = Math.floor(n)
    }

    const { data: maxRows } = await supabase
      .from('workflow_stages')
      .select('stage_order')
      .eq('phase_id', params.phaseId)
      .eq('organization_id', orgId)
      .order('stage_order', { ascending: false })
      .limit(1)

    const maxOrder = maxRows?.[0]?.stage_order ?? -1
    const nextOrder = maxOrder + 1

    const { data: inserted, error: insertError } = await supabase
      .from('workflow_stages')
      .insert({
        organization_id: orgId,
        phase_id: params.phaseId,
        name,
        stage_order: nextOrder,
        is_done: false,
        is_backlog: false,
        wip_limit: wip,
      })
      .select('id,name,stage_order,is_done,is_backlog,wip_limit')
      .single()

    if (insertError) throw insertError

    return NextResponse.json({ data: inserted })
  } catch (error: unknown) {
    const msg =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: string }).message)
        : 'Failed to create column'
    console.error('POST workflow-stages:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

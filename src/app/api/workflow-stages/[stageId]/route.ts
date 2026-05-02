import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { resolveWorkspaceOrgId } from '@/lib/api/resolve-workspace-org'

export async function PATCH(request: Request, { params }: { params: { stageId: string } }) {
  const supabase = createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveWorkspaceOrgId(supabase, request)
    if (!orgId) return NextResponse.json({ error: 'No workspace organization found' }, { status: 400 })

    const body = (await request.json()) as { wipLimit?: number | null }
    let wip: number | null | undefined = undefined

    if ('wipLimit' in body) {
      if (body.wipLimit === null) {
        wip = null
      } else {
        const n = typeof body.wipLimit === 'number' ? body.wipLimit : Number(body.wipLimit)
        if (!Number.isFinite(n) || n < 1) {
          return NextResponse.json({ error: 'WIP limit must be a positive number or null to clear' }, { status: 400 })
        }
        wip = Math.floor(n)
      }
    } else {
      return NextResponse.json({ error: 'wipLimit is required' }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from('workflow_stages')
      .update({ wip_limit: wip })
      .eq('id', params.stageId)
      .eq('organization_id', orgId)
      .select('id,name,stage_order,is_done,is_backlog,wip_limit')
      .single()

    if (error) throw error
    if (!updated) return NextResponse.json({ error: 'Column not found' }, { status: 404 })

    return NextResponse.json({ data: updated })
  } catch (error: unknown) {
    const msg =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: string }).message)
        : 'Failed to update column'
    console.error('PATCH workflow-stage:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

async function renumberStagesForPhase(
  supabase: ReturnType<typeof createClient>,
  phaseId: string,
  orgId: string
) {
  const { data: rows, error } = await supabase
    .from('workflow_stages')
    .select('id')
    .eq('phase_id', phaseId)
    .eq('organization_id', orgId)
    .order('stage_order', { ascending: true })

  if (error) throw error
  const list = rows ?? []

  for (let i = 0; i < list.length; i++) {
    const { error: u1 } = await supabase
      .from('workflow_stages')
      .update({ stage_order: 10000 + i })
      .eq('id', list[i].id)
      .eq('organization_id', orgId)
    if (u1) throw u1
  }
  for (let i = 0; i < list.length; i++) {
    const { error: u2 } = await supabase
      .from('workflow_stages')
      .update({ stage_order: i })
      .eq('id', list[i].id)
      .eq('organization_id', orgId)
    if (u2) throw u2
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { stageId: string } }
) {
  const supabase = createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveWorkspaceOrgId(supabase, request)
    if (!orgId) return NextResponse.json({ error: 'No workspace organization found' }, { status: 400 })

    const { data: stage, error: stageError } = await supabase
      .from('workflow_stages')
      .select('id,phase_id,organization_id,is_backlog,is_done,name')
      .eq('id', params.stageId)
      .maybeSingle()

    if (stageError) throw stageError
    if (!stage || stage.organization_id !== orgId) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 })
    }

    const phaseId = stage.phase_id as string

    const { count: stageCount, error: cntErr } = await supabase
      .from('workflow_stages')
      .select('*', { count: 'exact', head: true })
      .eq('phase_id', phaseId)
      .eq('organization_id', orgId)

    if (cntErr) throw cntErr
    if ((stageCount ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last column in this phase. Add another column first.' },
        { status: 400 }
      )
    }

    let body: { moveTasksToStageId?: string } = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }

    const { data: taskRows, error: tasksErr } = await supabase
      .from('tasks')
      .select('id')
      .eq('workflow_stage_id', params.stageId)
      .eq('organization_id', orgId)

    if (tasksErr) throw tasksErr
    const taskIds = (taskRows ?? []).map((t) => t.id)

    if (taskIds.length > 0) {
      const moveTo = body.moveTasksToStageId?.trim()
      if (!moveTo || moveTo === params.stageId) {
        return NextResponse.json(
          { error: 'moveTasksToStageId is required when the column has tasks' },
          { status: 400 }
        )
      }

      const { data: targetStage, error: tsErr } = await supabase
        .from('workflow_stages')
        .select('id,phase_id,is_done')
        .eq('id', moveTo)
        .eq('organization_id', orgId)
        .maybeSingle()

      if (tsErr) throw tsErr
      if (!targetStage || targetStage.phase_id !== phaseId) {
        return NextResponse.json({ error: 'Target column must belong to the same phase' }, { status: 400 })
      }

      const { data: posRow } = await supabase
        .from('tasks')
        .select('position')
        .eq('workflow_stage_id', moveTo)
        .eq('organization_id', orgId)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle()

      let position = (typeof posRow?.position === 'number' ? posRow.position : -1) + 1

      for (const taskId of taskIds) {
        const completedAt = targetStage.is_done ? new Date().toISOString() : null
        const { error: upErr } = await supabase
          .from('tasks')
          .update({
            workflow_stage_id: moveTo,
            position,
            completed_at: completedAt,
          })
          .eq('id', taskId)
          .eq('organization_id', orgId)
        if (upErr) throw upErr
        position += 1
      }
    }

    const moveToId = body.moveTasksToStageId?.trim() ?? null

    if (stage.is_backlog) {
      await supabase
        .from('workflow_stages')
        .update({ is_backlog: false })
        .eq('phase_id', phaseId)
        .eq('organization_id', orgId)

      let newBacklogId: string | null =
        taskIds.length > 0 && moveToId && moveToId !== params.stageId ? moveToId : null

      if (!newBacklogId) {
        const { data: firstRemaining } = await supabase
          .from('workflow_stages')
          .select('id')
          .eq('phase_id', phaseId)
          .eq('organization_id', orgId)
          .neq('id', params.stageId)
          .order('stage_order', { ascending: true })
          .limit(1)
          .maybeSingle()
        newBacklogId = firstRemaining?.id ?? null
      }

      if (newBacklogId) {
        await supabase
          .from('workflow_stages')
          .update({ is_backlog: true })
          .eq('id', newBacklogId)
          .eq('organization_id', orgId)
      }
    }

    if (stage.is_done) {
      await supabase
        .from('workflow_stages')
        .update({ is_done: false })
        .eq('phase_id', phaseId)
        .eq('organization_id', orgId)

      let newDoneId: string | null =
        taskIds.length > 0 && moveToId && moveToId !== params.stageId ? moveToId : null

      if (!newDoneId) {
        const { data: lastRemaining } = await supabase
          .from('workflow_stages')
          .select('id')
          .eq('phase_id', phaseId)
          .eq('organization_id', orgId)
          .neq('id', params.stageId)
          .order('stage_order', { ascending: false })
          .limit(1)
          .maybeSingle()
        newDoneId = lastRemaining?.id ?? null
      }

      if (newDoneId) {
        await supabase
          .from('workflow_stages')
          .update({ is_done: true })
          .eq('id', newDoneId)
          .eq('organization_id', orgId)
      }
    }

    const { error: delErr } = await supabase.from('workflow_stages').delete().eq('id', params.stageId).eq('organization_id', orgId)

    if (delErr) throw delErr

    await renumberStagesForPhase(supabase, phaseId, orgId)

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const msg =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: string }).message)
        : 'Failed to delete column'
    console.error('DELETE workflow-stage:', error)
    const lower = msg.toLowerCase()
    const status =
      lower.includes('violates foreign key') || lower.includes('still referenced') ? 409 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

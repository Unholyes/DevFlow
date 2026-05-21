import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import { isMissingArchivedAtColumnError } from '@/lib/tasks/task-archive'
import { NextResponse } from 'next/server'

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function resolveOrgId(supabase: ReturnType<typeof createClient>) {
  const tenantSlug = getTenantSlug()
  if (tenantSlug) {
    const { data: org } = await supabase.from('organizations').select('id').eq('slug', tenantSlug).maybeSingle()
    return org?.id ?? null
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  return await resolvePrimaryOrgIdForUser(supabase as any, user.id)
}

type ArchiveBody = {
  action?: 'archive' | 'restore'
  project_id?: string
  process_id?: string
  stage_id?: string
  task_ids?: string[]
}

export async function POST(request: Request) {
  const supabase = createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Missing tenant context' }, { status: 400 })

    const body = (await request.json()) as ArchiveBody
    const action = body.action === 'restore' ? 'restore' : 'archive'
    const projectId = typeof body.project_id === 'string' ? body.project_id : ''
    const processId = typeof body.process_id === 'string' ? body.process_id : ''

    if (!uuidRe.test(projectId) || !uuidRe.test(processId)) {
      return NextResponse.json({ error: 'project_id and process_id are required' }, { status: 400 })
    }

    const now = new Date().toISOString()
    let idsToUpdate: string[] = []

    if (action === 'archive') {
      const stageId = typeof body.stage_id === 'string' ? body.stage_id : ''
      const explicitIds = Array.isArray(body.task_ids)
        ? body.task_ids.filter((id) => typeof id === 'string' && uuidRe.test(id))
        : []

      if (explicitIds.length > 0) {
        idsToUpdate = explicitIds
      } else if (uuidRe.test(stageId)) {
        const { data: stage, error: stageErr } = await supabase
          .from('workflow_stages')
          .select('id,is_done')
          .eq('id', stageId)
          .eq('organization_id', orgId)
          .maybeSingle()

        if (stageErr) throw stageErr
        if (!stage) return NextResponse.json({ error: 'Column not found' }, { status: 404 })
        if (!stage.is_done) {
          return NextResponse.json(
            { error: 'Only tasks in a completed (done) column can be archived' },
            { status: 400 }
          )
        }

        const { data: stageTasks, error: listErr } = await supabase
          .from('tasks')
          .select('id,archived_at')
          .eq('organization_id', orgId)
          .eq('project_id', projectId)
          .eq('process_id', processId)
          .eq('workflow_stage_id', stageId)
          .is('archived_at', null)

        if (listErr && isMissingArchivedAtColumnError(String(listErr.message ?? ''), listErr.code)) {
          return NextResponse.json(
            {
              error:
                'Task archive is not available yet. Apply the latest database migration (tasks.archived_at).',
            },
            { status: 503 }
          )
        }
        if (listErr) throw listErr

        idsToUpdate = (stageTasks ?? []).map((t) => t.id as string)
      } else {
        return NextResponse.json({ error: 'stage_id or task_ids is required' }, { status: 400 })
      }

      if (idsToUpdate.length === 0) {
        return NextResponse.json({ ok: true, updated: 0 })
      }

      const { data: rows, error: verifyErr } = await supabase
        .from('tasks')
        .select('id,workflow_stage_id,archived_at')
        .eq('organization_id', orgId)
        .eq('project_id', projectId)
        .eq('process_id', processId)
        .in('id', idsToUpdate)

      if (verifyErr) throw verifyErr

      const stageIds = [...new Set((rows ?? []).map((r) => r.workflow_stage_id as string))]
      const { data: stages, error: stagesErr } = await supabase
        .from('workflow_stages')
        .select('id,is_done')
        .eq('organization_id', orgId)
        .in('id', stageIds)

      if (stagesErr) throw stagesErr
      const doneIds = new Set((stages ?? []).filter((s) => s.is_done).map((s) => s.id))

      const invalid = (rows ?? []).filter(
        (r) => r.archived_at != null || !doneIds.has(r.workflow_stage_id as string)
      )
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: 'Only non-archived tasks in a completed column can be archived' },
          { status: 400 }
        )
      }

      const { error: updateErr } = await supabase
        .from('tasks')
        .update({ archived_at: now, updated_by_id: user.id })
        .eq('organization_id', orgId)
        .eq('project_id', projectId)
        .eq('process_id', processId)
        .in('id', idsToUpdate)
        .is('archived_at', null)

      if (updateErr) {
        if (isMissingArchivedAtColumnError(String(updateErr.message ?? ''), updateErr.code)) {
          return NextResponse.json(
            {
              error:
                'Task archive is not available yet. Apply the latest database migration (tasks.archived_at).',
            },
            { status: 503 }
          )
        }
        throw updateErr
      }

      return NextResponse.json({ ok: true, updated: idsToUpdate.length })
    }

    const restoreIds = Array.isArray(body.task_ids)
      ? body.task_ids.filter((id) => typeof id === 'string' && uuidRe.test(id))
      : []

    if (restoreIds.length === 0) {
      return NextResponse.json({ error: 'task_ids is required to restore' }, { status: 400 })
    }

    const { error: restoreErr } = await supabase
      .from('tasks')
      .update({ archived_at: null, updated_by_id: user.id })
      .eq('organization_id', orgId)
      .eq('project_id', projectId)
      .eq('process_id', processId)
      .in('id', restoreIds)
      .not('archived_at', 'is', null)

    if (restoreErr) {
      if (isMissingArchivedAtColumnError(String(restoreErr.message ?? ''), restoreErr.code)) {
        return NextResponse.json(
          {
            error:
              'Task archive is not available yet. Apply the latest database migration (tasks.archived_at).',
          },
          { status: 503 }
        )
      }
      throw restoreErr
    }

    return NextResponse.json({ ok: true, updated: restoreIds.length })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Archive operation failed'
    console.error('POST /api/tasks/archive:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

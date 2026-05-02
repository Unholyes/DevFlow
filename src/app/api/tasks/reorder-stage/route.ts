import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import { NextResponse } from 'next/server'

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

export async function POST(request: Request) {
  const supabase = createClient()

  try {
    const orgId = await resolveOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Missing tenant context' }, { status: 400 })

    const body = await request.json()
    const { projectId, processId, stageId, orderedTaskIds } = body as {
      projectId?: string
      processId?: string
      stageId?: string
      orderedTaskIds?: string[]
    }

    if (!projectId || !processId || !stageId || !Array.isArray(orderedTaskIds)) {
      return NextResponse.json(
        { error: 'projectId, processId, stageId, and orderedTaskIds are required' },
        { status: 400 }
      )
    }

    const results = await Promise.all(
      orderedTaskIds.map((taskId, i) =>
        supabase
          .from('tasks')
          .update({ position: i })
          .eq('id', taskId)
          .eq('organization_id', orgId)
          .eq('project_id', projectId)
          .eq('process_id', processId)
          .eq('workflow_stage_id', stageId)
      )
    )

    const firstErr = results.find((r) => r.error)?.error
    if (firstErr) throw firstErr

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const msg =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: string }).message)
        : 'Failed to reorder tasks'
    console.error('reorder-stage:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

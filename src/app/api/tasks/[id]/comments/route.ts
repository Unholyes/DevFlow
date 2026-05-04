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

/**
 * POST body: { content: string } — inserts into `task_comments` (organization_id + task_id + user_id + content).
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const taskId = params.id

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Missing tenant context' }, { status: 400 })

    const body = (await request.json()) as { content?: unknown }
    const content = typeof body.content === 'string' ? body.content.trim() : ''
    if (!content) return NextResponse.json({ error: 'Comment content is required' }, { status: 400 })

    const { data: task, error: taskErr } = await supabase
      .from('tasks')
      .select('id, organization_id')
      .eq('id', taskId)
      .eq('organization_id', orgId)
      .maybeSingle()

    if (taskErr) throw taskErr
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    const { data: inserted, error: insErr } = await supabase
      .from('task_comments')
      .insert({
        organization_id: task.organization_id,
        task_id: taskId,
        user_id: user.id,
        content,
      })
      .select('id, content, created_at, user_id')
      .single()

    if (insErr) throw insErr

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle()

    return NextResponse.json({
      comment: {
        ...inserted,
        author: profile ?? { full_name: null as string | null, avatar_url: null as string | null },
      },
    })
  } catch (e: unknown) {
    console.error('POST /api/tasks/[id]/comments:', e)
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
  }
}

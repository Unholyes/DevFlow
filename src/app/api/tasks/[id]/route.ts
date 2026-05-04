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
 * GET: single task with workflow stage, assignee profile, and comments (per `task_comments` + `profiles`).
 * Matches RLS on `tasks`, `workflow_stages`, `task_comments`, and `profiles`.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const taskId = params.id

  try {
    const orgId = await resolveOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Missing tenant context' }, { status: 400 })

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('organization_id', orgId)
      .maybeSingle()

    if (taskError) throw taskError
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    const [stageRes, commentsRes, assigneeRes] = await Promise.all([
      supabase.from('workflow_stages').select('id, name, is_done, is_backlog').eq('id', task.workflow_stage_id).maybeSingle(),
      supabase
        .from('task_comments')
        .select('id, content, created_at, user_id')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true }),
      task.assignee_id
        ? supabase.from('profiles').select('id, full_name, avatar_url').eq('id', task.assignee_id).maybeSingle()
        : Promise.resolve({ data: null } as const),
    ])

    const commentRows = commentsRes.data ?? []
    const userIds = [...new Set(commentRows.map((c) => c.user_id))]
    let profileById: Record<string, { full_name: string | null; avatar_url: string | null }> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds)
      profileById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))
    }

    const comments = commentRows.map((c) => ({
      ...c,
      author: profileById[c.user_id] ?? { full_name: null as string | null, avatar_url: null as string | null },
    }))

    return NextResponse.json({
      task,
      stage: stageRes.data ?? null,
      assignee: assigneeRes.data ?? null,
      comments,
    })
  } catch (e: unknown) {
    console.error('GET /api/tasks/[id]:', e)
    return NextResponse.json({ error: 'Failed to load task' }, { status: 500 })
  }
}

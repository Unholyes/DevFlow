import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import type { NotificationDto, UserNotificationRow } from '@/lib/notifications/types'

async function resolveOrgId(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { user: null as null, orgId: null as null }

  const tenantSlug = getTenantSlug()
  const orgId = tenantSlug
    ? (await supabase.from('organizations').select('id').eq('slug', tenantSlug).maybeSingle()).data?.id ?? null
    : await resolvePrimaryOrgIdForUser(supabase as any, user.id)

  return { user, orgId }
}

function mapRow(row: UserNotificationRow, actorNames: Record<string, string | null>): NotificationDto {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    read: row.read_at != null,
    createdAt: row.created_at,
    actorName: row.actor_id ? actorNames[row.actor_id] ?? null : null,
  }
}

export async function GET(request: Request) {
  const supabase = createClient()
  const { user, orgId } = await resolveOrgId(supabase)

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'Missing tenant context' }, { status: 400 })

  const url = new URL(request.url)
  const limitRaw = url.searchParams.get('limit')
  const limit = limitRaw ? Math.min(50, Math.max(1, parseInt(limitRaw, 10) || 20)) : 20
  const unreadOnly = url.searchParams.get('unread') === '1'

  let query = supabase
    .from('user_notifications')
    .select(
      'id, organization_id, recipient_id, actor_id, type, title, body, href, project_id, task_id, read_at, created_at'
    )
    .eq('recipient_id', user.id)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (unreadOnly) query = query.is('read_at', null)

  const { data: rows, error } = await query

  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') {
      return NextResponse.json({ data: [], unreadCount: 0 })
    }
    console.error('GET /api/notifications:', error)
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 })
  }

  const list = (rows ?? []) as UserNotificationRow[]
  const actorIds = [...new Set(list.map((r) => r.actor_id).filter(Boolean))] as string[]
  const actorNames: Record<string, string | null> = {}
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', actorIds)
    for (const p of profiles ?? []) {
      actorNames[p.id as string] = (p.full_name as string | null) ?? null
    }
  }

  const { count: unreadCount, error: countError } = await supabase
    .from('user_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', user.id)
    .eq('organization_id', orgId)
    .is('read_at', null)

  if (countError && countError.code !== '42P01' && countError.code !== 'PGRST205') {
    console.error('GET /api/notifications unread count:', countError)
  }

  return NextResponse.json({
    data: list.map((r) => mapRow(r, actorNames)),
    unreadCount: unreadCount ?? 0,
  })
}

export async function PATCH(request: Request) {
  const supabase = createClient()
  const { user, orgId } = await resolveOrgId(supabase)

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: 'Missing tenant context' }, { status: 400 })

  const body = (await request.json()) as { id?: string; markAllRead?: boolean }

  if (body.markAllRead) {
    const { error } = await supabase
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', user.id)
      .eq('organization_id', orgId)
      .is('read_at', null)

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return NextResponse.json({ ok: true })
      }
      return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  const id = body.id?.trim()
  if (!id) return NextResponse.json({ error: 'Notification id is required' }, { status: 400 })

  const { error } = await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('recipient_id', user.id)
    .eq('organization_id', orgId)

  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') {
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

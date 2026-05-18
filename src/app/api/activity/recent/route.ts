import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import { loadRecentActivity } from '@/lib/activity/load-recent-activity'

export async function GET(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantSlug = getTenantSlug()
  const orgId = tenantSlug
    ? (await supabase.from('organizations').select('id').eq('slug', tenantSlug).maybeSingle()).data?.id ?? null
    : await resolvePrimaryOrgIdForUser(supabase as any, user.id)

  if (!orgId) {
    return NextResponse.json({ error: 'No organization' }, { status: 403 })
  }

  const url = new URL(request.url)
  const projectId = url.searchParams.get('project')?.trim() || null
  const phaseId = url.searchParams.get('phase')?.trim() || null
  const processId = url.searchParams.get('process')?.trim() || null
  const limitRaw = url.searchParams.get('limit')
  const limit = limitRaw ? Math.min(50, Math.max(1, parseInt(limitRaw, 10) || 15)) : 15

  const activities = await loadRecentActivity(supabase as any, {
    organizationId: orgId,
    projectId,
    phaseId,
    processId,
    limit,
  })

  return NextResponse.json({ data: activities })
}

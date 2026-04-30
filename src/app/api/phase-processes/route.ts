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

  // Fallback for base-domain / localhost (no tenant slug): use user's primary org.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  return await resolvePrimaryOrgIdForUser(supabase as any, user.id)
}

export async function PATCH(request: Request) {
  const supabase = createClient()

  try {
    const orgId = await resolveOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Missing tenant context' }, { status: 400 })

    const body = await request.json()
    const { id, ...updates } = body ?? {}
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    // Only allow updating known safe fields.
    const allowed: Record<string, any> = {}
    if (typeof updates?.sprint_capacity_points === 'number') {
      allowed.sprint_capacity_points = updates.sprint_capacity_points
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('phase_processes')
      .update(allowed)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select('id,sprint_capacity_points')
      .single()

    if (error) throw error
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error updating phase process:', error)
    return NextResponse.json({ error: 'Failed to update phase process' }, { status: 500 })
  }
}


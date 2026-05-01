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

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  try {
    const orgId = await resolveOrgId(supabase)
    if (!orgId) return NextResponse.json({ data: [] })

    let query = supabase
      .from('sprints')
      .select('*')
      .eq('organization_id', orgId)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching sprints:', error)
    return NextResponse.json({ error: 'Failed to fetch sprints' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = createClient()
  
  try {
    const body = await request.json()
    const { 
      project_id, 
      phase_id,
      process_id,
      name, 
      start_date, 
      end_date,
      story_points_total = 0,
      status = 'active'
    } = body

    const orgId = await resolveOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Missing tenant context' }, { status: 400 })

    if (!name || !start_date || !end_date) {
      return NextResponse.json({ error: 'name, start_date, and end_date are required' }, { status: 400 })
    }

    const parsedStartDate = new Date(start_date)
    const parsedEndDate = new Date(end_date)
    if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
      return NextResponse.json({ error: 'Invalid sprint dates' }, { status: 400 })
    }
    if (parsedEndDate < parsedStartDate) {
      return NextResponse.json({ error: 'End date cannot be before start date' }, { status: 400 })
    }

    const normalizedStoryPointsTotal = Number.isFinite(Number(story_points_total))
      ? Math.max(0, Math.floor(Number(story_points_total)))
      : 0

    if (process_id) {
      const { data: process, error: processError } = await supabase
        .from('phase_processes')
        .select('sprint_capacity_points')
        .eq('id', process_id)
        .eq('organization_id', orgId)
        .maybeSingle()

      if (processError) throw processError

      const sprintCapacity = Number(process?.sprint_capacity_points ?? 0)
      if (sprintCapacity > 0 && normalizedStoryPointsTotal > sprintCapacity) {
        return NextResponse.json(
          { error: `Sprint exceeds capacity (${normalizedStoryPointsTotal}/${sprintCapacity} story points)` },
          { status: 400 }
        )
      }
    }

    const { data, error } = await supabase
      .from('sprints')
      .insert({
        organization_id: orgId,
        project_id,
        phase_id,
        process_id: process_id ?? null,
        name,
        start_date,
        end_date,
        story_points_total: normalizedStoryPointsTotal,
        status,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error creating sprint:', error)
    return NextResponse.json({ error: 'Failed to create sprint' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const supabase = createClient()
  
  try {
    const orgId = await resolveOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Missing tenant context' }, { status: 400 })

    const body = await request.json()
    const { id, ...updates } = body

    const { data, error } = await supabase
      .from('sprints')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error updating sprint:', error)
    return NextResponse.json({ error: 'Failed to update sprint' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const sprintId = searchParams.get('id')

  if (!sprintId) {
    return NextResponse.json({ error: 'Sprint ID is required' }, { status: 400 })
  }

  try {
    const orgId = await resolveOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Missing tenant context' }, { status: 400 })

    const { error } = await supabase
      .from('sprints')
      .delete()
      .eq('id', sprintId)
      .eq('organization_id', orgId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting sprint:', error)
    return NextResponse.json({ error: 'Failed to delete sprint' }, { status: 500 })
  }
}

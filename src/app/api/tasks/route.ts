import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import { NextResponse } from 'next/server'

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && (error as any).code === '23505'
}

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
  const sprintId = searchParams.get('sprintId')
  const processId = searchParams.get('processId')

  try {
    const orgId = await resolveOrgId(supabase)
    if (!orgId) return NextResponse.json({ data: [] })

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('organization_id', orgId)

    // Skip project_id filter if it's not a valid UUID (for development with mock data)
    if (projectId && projectId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      query = query.eq('project_id', projectId)
    }

    if (sprintId) {
      query = query.eq('sprint_id', sprintId)
    } else {
      // If no sprint specified, get backlog tasks (no sprint assigned)
      query = query.is('sprint_id', null)
    }

    if (processId) {
      query = query.eq('process_id', processId)
    }

    const { data, error } = await query.order('position', { ascending: true })

    if (error) {
      console.error('Supabase error:', error);
      // Return empty array on RLS error instead of crashing
      return NextResponse.json({ data: [] });
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    // Return empty array on any error
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: Request) {
  const supabase = createClient()
  
  try {
    const orgId = await resolveOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Missing tenant context', data: null }, { status: 400 })

    const body = await request.json();
    const {
      project_id,
      process_id,
      title,
      description,
      priority,
      story_points: storyPointsRaw,
      due_date,
      assignee_id,
      workflow_stage_id,
      sprint_id,
      size_band: sizeBandRaw,
      service_class: serviceClassRaw,
    } = body;

    const story_points =
      storyPointsRaw === null
        ? null
        : storyPointsRaw === undefined
          ? 0
          : (() => {
              const n = Number(storyPointsRaw)
              return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0
            })()

    const sizeBands = new Set(['xs', 's', 'm', 'l', 'xl'])
    const size_band =
      sizeBandRaw == null || sizeBandRaw === ''
        ? null
        : sizeBands.has(String(sizeBandRaw).toLowerCase())
          ? String(sizeBandRaw).toLowerCase()
          : null

    const serviceClasses = new Set(['standard', 'fixed_date', 'expedite'])
    const service_class =
      serviceClassRaw == null || serviceClassRaw === ''
        ? 'standard'
        : serviceClasses.has(String(serviceClassRaw))
          ? String(serviceClassRaw)
          : 'standard'

    // Skip project_id if it's not a valid UUID (for development)
    const validProjectId = project_id && project_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? project_id : null;
    if (!validProjectId) {
      return NextResponse.json({ error: 'project_id is required', data: null }, { status: 400 })
    }

    // Get the highest position for ordering
    let newPosition = 0;
    if (validProjectId) {
      const { data: maxPosition } = await supabase
        .from('tasks')
        .select('position')
        .eq('organization_id', orgId)
        .eq('project_id', validProjectId)
        .eq('process_id', process_id ?? null)
        .order('position', { ascending: false })
        .limit(1)
        .single();
      newPosition = (maxPosition?.position ?? -1) + 1;
    }

    const nowIso = new Date().toISOString()

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        organization_id: orgId,
        project_id: validProjectId,
        process_id: process_id ?? null,
        title,
        description,
        priority,
        story_points,
        due_date,
        assignee_id,
        workflow_stage_id,
        sprint_id,
        position: newPosition,
        size_band,
        service_class,
        current_stage_entered_at: nowIso,
        // Temporarily skip created_by_id to avoid RLS recursion
        // created_by_id: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: 'A task with this name already exists in this sprint.', data: null },
        { status: 409 }
      )
    }
    console.error('Error creating task:', error)
    return NextResponse.json({ error: 'Failed to create task', data: null }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const supabase = createClient()
  
  try {
    const orgId = await resolveOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Missing tenant context' }, { status: 400 })

    const body = await request.json()
    const { id, ...updates } = body as Record<string, unknown> & { id?: string }

    if (updates.workflow_stage_id !== undefined && typeof updates.workflow_stage_id === 'string') {
      const { data: existing } = await supabase
        .from('tasks')
        .select('workflow_stage_id')
        .eq('id', id)
        .eq('organization_id', orgId)
        .maybeSingle()

      if (existing && existing.workflow_stage_id !== updates.workflow_stage_id) {
        updates.current_stage_entered_at = new Date().toISOString()
      }
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error: unknown) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: 'A task with this name already exists in this sprint.' },
        { status: 409 }
      )
    }
    const msg =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: string }).message)
        : 'Failed to update task'
    console.error('Error updating task:', error)
    const lower = msg.toLowerCase()
    const status =
      lower.includes('wip limit') || lower.includes('kanban wip') ? 409 : lower.includes('violates') ? 400 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function DELETE(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('id')

  if (!taskId) {
    return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
  }

  try {
    const orgId = await resolveOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Missing tenant context' }, { status: 400 })

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('organization_id', orgId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}

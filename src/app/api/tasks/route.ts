import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import { NextResponse } from 'next/server'
import { resolveAssigneeIdForTask, resolveTeamIdForTask } from '@/lib/tasks/validate-task-assignments'

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

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function enrichTasksForNavigator(
  supabase: ReturnType<typeof createClient>,
  rows: Record<string, unknown>[]
) {
  if (rows.length === 0) return []

  const projectIds = [...new Set(rows.map((t) => t.project_id).filter(Boolean))] as string[]
  const stageIds = [...new Set(rows.map((t) => t.workflow_stage_id).filter(Boolean))] as string[]
  const processIds = [...new Set(rows.map((t) => t.process_id).filter(Boolean))] as string[]

  const [projectsRes, stagesRes, processesRes] = await Promise.all([
    projectIds.length
      ? supabase.from('projects').select('id,name').in('id', projectIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    stageIds.length
      ? supabase
          .from('workflow_stages')
          .select('id,name,is_done,is_backlog')
          .in('id', stageIds)
      : Promise.resolve({ data: [] as { id: string; name: string; is_done: boolean; is_backlog: boolean }[] }),
    processIds.length
      ? supabase.from('phase_processes').select('id,phase_id').in('id', processIds)
      : Promise.resolve({ data: [] as { id: string; phase_id: string }[] }),
  ])

  const projectById = Object.fromEntries((projectsRes.data ?? []).map((p) => [p.id, p]))
  const stageById = Object.fromEntries((stagesRes.data ?? []).map((s) => [s.id, s]))
  const processById = Object.fromEntries((processesRes.data ?? []).map((p) => [p.id, p]))

  return rows.map((t: Record<string, any>) => ({
    ...t,
    project: t.project_id ? projectById[t.project_id as string] ?? null : null,
    workflow_stage: t.workflow_stage_id ? stageById[t.workflow_stage_id as string] ?? null : null,
    phase_process: t.process_id ? processById[t.process_id as string] ?? null : null,
  }))
}

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const assignee = searchParams.get('assignee')
  const projectId = searchParams.get('projectId')
  const sprintId = searchParams.get('sprintId')
  const processId = searchParams.get('processId')

  try {
    const orgId = await resolveOrgId(supabase)
    if (!orgId) return NextResponse.json({ data: [] })

    const teamIdFilter = searchParams.get('teamId')
    const teamIdOk = teamIdFilter && uuidRe.test(teamIdFilter)

    /** Tasks assigned to the signed-in user (any sprint/backlog). Used by /dashboard/tasks. */
    if (assignee === 'me') {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ data: [] })

      let q = supabase
        .from('tasks')
        .select('*')
        .eq('organization_id', orgId)
        .eq('assignee_id', user.id)

      if (projectId && uuidRe.test(projectId)) {
        q = q.eq('project_id', projectId)
      }
      if (processId && uuidRe.test(processId)) {
        q = q.eq('process_id', processId)
      }
      if (teamIdOk) {
        q = q.eq('team_id', teamIdFilter!)
      }

      const { data: tasks, error } = await q.order('updated_at', { ascending: false }).limit(400)

      if (error) {
        console.error('Supabase error (assignee=me):', error)
        return NextResponse.json({ data: [] })
      }

      const enriched = await enrichTasksForNavigator(supabase, tasks ?? [])
      return NextResponse.json({ data: enriched })
    }

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('organization_id', orgId)

    // Skip project_id filter if it's not a valid UUID (for development with mock data)
    if (projectId && uuidRe.test(projectId)) {
      query = query.eq('project_id', projectId)
    }

    if (sprintId) {
      query = query.eq('sprint_id', sprintId)
    } else {
      // If no sprint specified, get backlog tasks (no sprint assigned)
      query = query.is('sprint_id', null)
    }

    if (processId && uuidRe.test(processId)) {
      query = query.eq('process_id', processId)
    }

    if (teamIdOk) {
      query = query.eq('team_id', teamIdFilter!)
    }

    const { data, error } = await query.order('position', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      // Return empty array on RLS error instead of crashing
      return NextResponse.json({ data: [] })
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
      team_id: teamIdRaw,
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

    const teamResolved = await resolveTeamIdForTask(supabase, orgId, teamIdRaw)
    if (!teamResolved.ok) {
      return NextResponse.json(
        { error: teamResolved.error, code: teamResolved.code, data: null },
        { status: teamResolved.status }
      )
    }

    const assigneeResolved = await resolveAssigneeIdForTask(supabase, orgId, assignee_id)
    if (!assigneeResolved.ok) {
      return NextResponse.json(
        { error: assigneeResolved.error, code: assigneeResolved.code, data: null },
        { status: assigneeResolved.status }
      )
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

    const insertRow: Record<string, unknown> = {
      organization_id: orgId,
      project_id: validProjectId,
      process_id: process_id ?? null,
      title,
      description,
      priority,
      story_points,
      due_date,
      workflow_stage_id,
      sprint_id,
      position: newPosition,
      size_band,
      service_class,
      current_stage_entered_at: nowIso,
    }
    if (teamResolved.teamId !== undefined) {
      insertRow.team_id = teamResolved.teamId
    }
    if (assigneeResolved.assigneeId !== undefined) {
      insertRow.assignee_id = assigneeResolved.assigneeId
    }

    const { data, error } = await supabase.from('tasks').insert(insertRow).select().single()

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

    if (updates.team_id !== undefined) {
      const tr = await resolveTeamIdForTask(supabase, orgId, updates.team_id)
      if (!tr.ok) {
        return NextResponse.json({ error: tr.error, code: tr.code }, { status: tr.status })
      }
      updates.team_id = tr.teamId
    }

    if (updates.assignee_id !== undefined) {
      const ar = await resolveAssigneeIdForTask(supabase, orgId, updates.assignee_id)
      if (!ar.ok) {
        return NextResponse.json({ error: ar.error, code: ar.code }, { status: ar.status })
      }
      updates.assignee_id = ar.assigneeId
    }

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

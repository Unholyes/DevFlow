import { createClient } from '@/lib/supabase/server'
import { userCanCreateSprintDraft, userCanManageSprints } from '@/lib/permissions/sprint-permissions'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import { NextResponse } from 'next/server'

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505'
}

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null) {
    const message = String((error as { message?: unknown }).message ?? '').trim()
    if (message) return message
  }
  return fallback
}

async function resolveOrgAndUser(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { orgId: null as string | null, userId: null as string | null }

  const tenantSlug = getTenantSlug()
  if (tenantSlug) {
    const { data: org } = await supabase.from('organizations').select('id').eq('slug', tenantSlug).maybeSingle()
    return { orgId: org?.id ?? null, userId: user.id }
  }

  const orgId = await resolvePrimaryOrgIdForUser(supabase as any, user.id)
  return { orgId, userId: user.id }
}

async function resolveOrgId(supabase: ReturnType<typeof createClient>) {
  const { orgId } = await resolveOrgAndUser(supabase)
  return orgId
}

function parseSprintStatus(value: unknown): 'draft' | 'planned' | 'active' | 'closed' {
  const s = String(value ?? 'active').toLowerCase()
  if (s === 'draft' || s === 'planned' || s === 'active' || s === 'closed') return s
  return 'active'
}

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  try {
    const orgId = await resolveOrgId(supabase)
    if (!orgId) return NextResponse.json({ data: [] })

    let query = supabase.from('sprints').select('*').eq('organization_id', orgId)

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
    const { orgId, userId } = await resolveOrgAndUser(supabase)
    if (!orgId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      project_id,
      phase_id,
      process_id,
      name,
      start_date,
      end_date,
      story_points_total = 0,
      status: rawStatus,
    } = body

    const status = parseSprintStatus(rawStatus)

    if (!project_id || !phase_id || !name?.trim()) {
      return NextResponse.json({ error: 'project_id, phase_id, and name are required' }, { status: 400 })
    }

    const [canCreateDraft, canManage] = await Promise.all([
      userCanCreateSprintDraft(supabase, { organizationId: orgId, userId, projectId: project_id }),
      userCanManageSprints(supabase, { organizationId: orgId, userId, projectId: project_id }),
    ])

    if (status === 'draft') {
      if (!canCreateDraft) {
        return NextResponse.json({ error: 'You do not have permission to create sprint drafts' }, { status: 403 })
      }
    } else if (status === 'active') {
      if (!canManage) {
        return NextResponse.json({ error: 'You do not have permission to start sprints' }, { status: 403 })
      }
    } else if (!canManage) {
      return NextResponse.json({ error: 'You do not have permission to manage sprints' }, { status: 403 })
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
          { status: 400 },
        )
      }
    }

    let startDateValue: string | null = null
    let endDateValue: string | null = null

    if (status !== 'draft') {
      if (!start_date || !end_date) {
        return NextResponse.json({ error: 'start_date and end_date are required' }, { status: 400 })
      }

      const parsedStartDate = new Date(start_date)
      const parsedEndDate = new Date(end_date)
      if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
        return NextResponse.json({ error: 'Invalid sprint dates' }, { status: 400 })
      }
      if (parsedEndDate < parsedStartDate) {
        return NextResponse.json({ error: 'End date cannot be before start date' }, { status: 400 })
      }

      startDateValue = start_date
      endDateValue = end_date
    }

    const { data, error } = await supabase
      .from('sprints')
      .insert({
        organization_id: orgId,
        project_id,
        phase_id,
        process_id: process_id ?? null,
        name: String(name).trim(),
        start_date: startDateValue,
        end_date: endDateValue,
        story_points_total: normalizedStoryPointsTotal,
        status,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: 'A sprint with this name already exists in this process.' },
        { status: 409 },
      )
    }
    console.error('Error creating sprint:', error)
    return NextResponse.json({ error: errorMessage(error, 'Failed to create sprint') }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const supabase = createClient()

  try {
    const { orgId, userId } = await resolveOrgAndUser(supabase)
    if (!orgId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, action, start_date, end_date, sprint_start_stage_id, ...updates } = body as {
      id?: string
      action?: 'approve' | 'reject'
      start_date?: string
      end_date?: string
      sprint_start_stage_id?: string
      status?: string
      name?: string
      [key: string]: unknown
    }

    if (!id) {
      return NextResponse.json({ error: 'Sprint id is required' }, { status: 400 })
    }

    const { data: existing, error: loadError } = await supabase
      .from('sprints')
      .select('id,project_id,status')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle()

    if (loadError) throw loadError
    if (!existing?.id) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
    }

    const projectId = String((existing as { project_id?: unknown }).project_id ?? '')
    const canManage = await userCanManageSprints(supabase, {
      organizationId: orgId,
      userId,
      projectId,
    })

    if (action === 'reject') {
      if (!canManage) {
        return NextResponse.json({ error: 'You do not have permission to reject sprint drafts' }, { status: 403 })
      }

      await supabase.from('tasks').update({ sprint_id: null }).eq('sprint_id', id).eq('organization_id', orgId)

      const { error: deleteError } = await supabase.from('sprints').delete().eq('id', id).eq('organization_id', orgId)
      if (deleteError) throw deleteError

      return NextResponse.json({ success: true })
    }

    if (action === 'approve' || (updates.status === 'active' && (existing as { status?: string }).status === 'draft')) {
      if (!canManage) {
        return NextResponse.json({ error: 'You do not have permission to approve sprints' }, { status: 403 })
      }

      if (String((existing as { status?: string }).status ?? '') !== 'draft') {
        return NextResponse.json({ error: 'Only draft sprints can be approved' }, { status: 400 })
      }

      const approveStart = start_date ?? (updates.start_date as string | undefined)
      const approveEnd = end_date ?? (updates.end_date as string | undefined)
      if (!approveStart || !approveEnd) {
        return NextResponse.json({ error: 'start_date and end_date are required to approve a sprint' }, { status: 400 })
      }

      const parsedStartDate = new Date(approveStart)
      const parsedEndDate = new Date(approveEnd)
      if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
        return NextResponse.json({ error: 'Invalid sprint dates' }, { status: 400 })
      }
      if (parsedEndDate < parsedStartDate) {
        return NextResponse.json({ error: 'End date cannot be before start date' }, { status: 400 })
      }

      const { data, error } = await supabase
        .from('sprints')
        .update({
          status: 'active',
          start_date: approveStart,
          end_date: approveEnd,
          ...(updates.name ? { name: String(updates.name).trim() } : {}),
        })
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single()

      if (error) throw error

      if (sprint_start_stage_id) {
        await supabase
          .from('tasks')
          .update({ workflow_stage_id: sprint_start_stage_id })
          .eq('sprint_id', id)
          .eq('organization_id', orgId)
      }

      return NextResponse.json({ data })
    }

    if (!canManage) {
      return NextResponse.json({ error: 'You do not have permission to update sprints' }, { status: 403 })
    }

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
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: 'A sprint with this name already exists in this process.' },
        { status: 409 },
      )
    }
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
    const { orgId, userId } = await resolveOrgAndUser(supabase)
    if (!orgId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: existing } = await supabase
      .from('sprints')
      .select('project_id,status')
      .eq('id', sprintId)
      .eq('organization_id', orgId)
      .maybeSingle()

    if (!existing?.project_id) {
      return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
    }

    const canManage = await userCanManageSprints(supabase, {
      organizationId: orgId,
      userId,
      projectId: String(existing.project_id),
    })

    const isDraft = String((existing as { status?: string }).status ?? '') === 'draft'
    const canCreateDraft =
      isDraft &&
      (await userCanCreateSprintDraft(supabase, {
        organizationId: orgId,
        userId,
        projectId: String(existing.project_id),
      }))

    if (!canManage && !canCreateDraft) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await supabase.from('tasks').update({ sprint_id: null }).eq('sprint_id', sprintId).eq('organization_id', orgId)

    const { error } = await supabase.from('sprints').delete().eq('id', sprintId).eq('organization_id', orgId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting sprint:', error)
    return NextResponse.json({ error: 'Failed to delete sprint' }, { status: 500 })
  }
}

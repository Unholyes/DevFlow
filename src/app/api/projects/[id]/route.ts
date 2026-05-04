import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TENANT_SLUG_HEADER } from '@/lib/tenant/resolve'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'

async function resolveOrgIdForRequest(supabase: ReturnType<typeof createClient>, userId: string, tenantSlug: string | null) {
  if (tenantSlug) {
    const { data: org, error } = await supabase.from('organizations').select('id').eq('slug', tenantSlug).maybeSingle()
    if (error) throw error
    if (org?.id) return org.id as string
  }

  return resolvePrimaryOrgIdForUser(supabase as any, userId)
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantSlug = request.headers.get(TENANT_SLUG_HEADER)
    const orgId = await resolveOrgIdForRequest(supabase, user.id, tenantSlug)
    if (!orgId) return NextResponse.json({ error: 'No workspace organization found for user' }, { status: 400 })

    const body = (await request.json()) as {
      name?: string
      description?: string
      status?: 'active' | 'completed' | 'archived'
      phaseGatingEnabled?: boolean
      dueDate?: string | null
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    const updatesBase = {
      name: body.name.trim(),
      description: body.description?.trim() || null,
      status: body.status ?? 'active',
    } as Record<string, unknown>

    const updatesWithDueDate = {
      ...updatesBase,
      due_date: body.dueDate || null,
    }

    const updatesWithGatingOnly = {
      ...updatesBase,
      phase_gating_enabled: !!body.phaseGatingEnabled,
    }

    const updatesWithAll = {
      ...updatesWithDueDate,
      phase_gating_enabled: !!body.phaseGatingEnabled,
    }

    const updateWithAllAttempt = await supabase
      .from('projects')
      .update(updatesWithAll)
      .eq('id', params.id)
      .eq('organization_id', orgId)
      .select('id')
      .maybeSingle()

    if (updateWithAllAttempt.error?.code === 'PGRST204') {
      const fallbackWithDueDate = await supabase
        .from('projects')
        .update(updatesWithDueDate)
        .eq('id', params.id)
        .eq('organization_id', orgId)
        .select('id')
        .maybeSingle()

      if (fallbackWithDueDate.error?.code === 'PGRST204') {
        const fallbackWithGating = await supabase
          .from('projects')
          .update(updatesWithGatingOnly)
          .eq('id', params.id)
          .eq('organization_id', orgId)
          .select('id')
          .maybeSingle()

        if (fallbackWithGating.error?.code === 'PGRST204') {
          const fallbackBase = await supabase
            .from('projects')
            .update(updatesBase)
            .eq('id', params.id)
            .eq('organization_id', orgId)
            .select('id')
            .maybeSingle()

          if (fallbackBase.error) throw fallbackBase.error
          if (!fallbackBase.data?.id) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
          return NextResponse.json({ data: { id: fallbackBase.data.id } })
        }

        if (fallbackWithGating.error) throw fallbackWithGating.error
        if (!fallbackWithGating.data?.id) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        return NextResponse.json({ data: { id: fallbackWithGating.data.id } })
      }

      if (fallbackWithDueDate.error) throw fallbackWithDueDate.error
      if (!fallbackWithDueDate.data?.id) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      return NextResponse.json({ data: { id: fallbackWithDueDate.data.id } })
    }

    if (updateWithAllAttempt.error) throw updateWithAllAttempt.error
    if (!updateWithAllAttempt.data?.id) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    return NextResponse.json({ data: { id: updateWithAllAttempt.data.id } })
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenantSlug = request.headers.get(TENANT_SLUG_HEADER)
    const orgId = await resolveOrgIdForRequest(supabase, user.id, tenantSlug)
    if (!orgId) return NextResponse.json({ error: 'No workspace organization found for user' }, { status: 400 })

    const { data: phases, error: phaseLoadError } = await supabase
      .from('sdlc_phases')
      .select('id')
      .eq('organization_id', orgId)
      .eq('project_id', params.id)

    if (phaseLoadError) throw phaseLoadError

    const phaseIds = (phases ?? []).map((p) => p.id)

    if (phaseIds.length > 0) {
      const { error: tasksDeleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('organization_id', orgId)
        .eq('project_id', params.id)
      if (tasksDeleteError) throw tasksDeleteError

      const { error: sprintsDeleteError } = await supabase
        .from('sprints')
        .delete()
        .eq('organization_id', orgId)
        .eq('project_id', params.id)
      if (sprintsDeleteError) throw sprintsDeleteError

      const { error: stagesDeleteError } = await supabase
        .from('workflow_stages')
        .delete()
        .eq('organization_id', orgId)
        .in('phase_id', phaseIds)
      if (stagesDeleteError) throw stagesDeleteError

      const { error: phasesDeleteError } = await supabase
        .from('sdlc_phases')
        .delete()
        .eq('organization_id', orgId)
        .eq('project_id', params.id)
      if (phasesDeleteError) throw phasesDeleteError
    }

    const { error: membersDeleteError } = await supabase
      .from('project_members')
      .delete()
      .eq('organization_id', orgId)
      .eq('project_id', params.id)
    if (membersDeleteError && membersDeleteError.code !== '42P01') throw membersDeleteError

    const { error: projectDeleteError, data } = await supabase
      .from('projects')
      .delete()
      .eq('organization_id', orgId)
      .eq('id', params.id)
      .select('id')
      .maybeSingle()

    if (projectDeleteError) throw projectDeleteError
    if (!data?.id) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    return NextResponse.json({ data: { id: data.id } })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}

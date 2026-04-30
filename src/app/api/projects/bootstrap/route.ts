import { createClient } from '@/lib/supabase/server'
import { TENANT_SLUG_HEADER } from '@/lib/tenant/resolve'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import { NextResponse } from 'next/server'

type PhaseInput = {
  title: string
  methodology: 'scrum' | 'kanban'
  is_gated: boolean
}

function defaultStagesForMethodology(methodology: PhaseInput['methodology']) {
  if (methodology === 'scrum') {
    return [
      { name: 'Backlog', is_backlog: true, is_done: false },
      { name: 'To Do', is_backlog: false, is_done: false },
      { name: 'In Progress', is_backlog: false, is_done: false },
      { name: 'In Review', is_backlog: false, is_done: false },
      { name: 'Done', is_backlog: false, is_done: true },
    ]
  }

  return [
    { name: 'To Do', is_backlog: false, is_done: false },
    { name: 'In Progress', is_backlog: false, is_done: false },
    { name: 'In Review', is_backlog: false, is_done: false },
    { name: 'Completed', is_backlog: false, is_done: true },
  ]
}

export async function POST(request: Request) {
  const supabase = createClient()

  try {
    const tenantSlug = request.headers.get(TENANT_SLUG_HEADER)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let orgId: string | null = null

    if (tenantSlug) {
      const { data: orgBySlug, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', tenantSlug)
        .maybeSingle()

      if (orgError) throw orgError
      orgId = orgBySlug?.id ?? null
    }

    if (!orgId) {
      orgId = await resolvePrimaryOrgIdForUser(supabase as any, user.id)
    }

    if (!orgId) {
      return NextResponse.json({ error: 'No workspace organization found for user' }, { status: 400 })
    }

    const body = await request.json()
    const {
      projectName,
      projectDescription,
      phaseGatingEnabled,
      phases,
    }: {
      projectName: string
      projectDescription?: string
      phaseGatingEnabled?: boolean
      phases: PhaseInput[]
    } = body

    if (!projectName?.trim()) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }
    if (!Array.isArray(phases) || phases.length < 1) {
      return NextResponse.json({ error: 'At least one phase is required' }, { status: 400 })
    }

    const projectInsertBase = {
      organization_id: orgId,
      name: projectName.trim(),
      description: projectDescription?.trim() || null,
    } as Record<string, unknown>

    const projectInsertWithGating = {
      ...projectInsertBase,
      phase_gating_enabled: !!phaseGatingEnabled,
    }

    let project: { id: string } | null = null
    let projectError: any = null

    {
      const attempt = await supabase.from('projects').insert(projectInsertWithGating).select('id').single()
      project = attempt.data
      projectError = attempt.error
    }

    if (projectError?.code === 'PGRST204') {
      const attempt = await supabase.from('projects').insert(projectInsertBase).select('id').single()
      project = attempt.data
      projectError = attempt.error
    }

    if (projectError) throw projectError
    if (!project?.id) return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })

    const createdPhaseIds: { id: string; methodology: PhaseInput['methodology'] }[] = []

    for (let i = 0; i < phases.length; i++) {
      const p = phases[i]
      if (!p?.title?.trim()) continue

      const phaseInsertBase = {
        organization_id: orgId,
        project_id: project.id,
        methodology: p.methodology,
        order_index: i,
        title: p.title.trim(),
        status: 'active',
      } as Record<string, unknown>

      const phaseInsertWithGating = {
        ...phaseInsertBase,
        is_gated: !!p.is_gated,
      }

      let phase: { id: string } | null = null
      let phaseError: any = null

      {
        const attempt = await supabase.from('sdlc_phases').insert(phaseInsertWithGating).select('id').single()
        phase = attempt.data
        phaseError = attempt.error
      }

      if (phaseError?.code === 'PGRST204') {
        const attempt = await supabase.from('sdlc_phases').insert(phaseInsertBase).select('id').single()
        phase = attempt.data
        phaseError = attempt.error
      }

      if (phaseError) throw phaseError
      if (!phase?.id) throw new Error('Failed to create phase')
      createdPhaseIds.push({ id: phase.id, methodology: p.methodology })
    }

    for (const phase of createdPhaseIds) {
      const stages = defaultStagesForMethodology(phase.methodology)
      const rows = stages.map((s, idx) => ({
        organization_id: orgId,
        phase_id: phase.id,
        name: s.name,
        stage_order: idx,
        is_done: s.is_done,
        is_backlog: s.is_backlog,
        wip_limit: null,
      }))

      const { error: stagesError } = await supabase.from('workflow_stages').insert(rows)
      if (stagesError) throw stagesError
    }

    return NextResponse.json({ data: { project_id: project.id } })
  } catch (error) {
    console.error('Error creating project from setup wizard:', error)
    const e = error as any
    if (e?.code === 'PGRST204') {
      return NextResponse.json(
        {
          error:
            "Database schema is missing gating columns. Run `migrations/add_phase_gating.sql` (projects.phase_gating_enabled and sdlc_phases.is_gated) and retry.",
        },
        { status: 500 }
      )
    }
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}

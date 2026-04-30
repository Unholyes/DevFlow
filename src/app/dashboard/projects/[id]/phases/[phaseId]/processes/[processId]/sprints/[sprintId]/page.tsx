import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { SprintDetailsPageClient } from '@/components/sprints/sprint-details-page-client'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'

async function ensureBacklogStageId(supabase: any, orgId: string, phaseId: string) {
  const { data: existingBacklog } = await supabase
    .from('workflow_stages')
    .select('id')
    .eq('phase_id', phaseId)
    .eq('organization_id', orgId)
    .eq('is_backlog', true)
    .order('stage_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existingBacklog?.id) return existingBacklog.id as string

  // Prefer a stage explicitly named "Backlog" if it exists.
  const { data: backlogByName } = await supabase
    .from('workflow_stages')
    .select('id')
    .eq('phase_id', phaseId)
    .eq('organization_id', orgId)
    .ilike('name', '%backlog%')
    .order('stage_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (backlogByName?.id) {
    await supabase
      .from('workflow_stages')
      .update({ is_backlog: false })
      .eq('phase_id', phaseId)
      .eq('organization_id', orgId)

    await supabase
      .from('workflow_stages')
      .update({ is_backlog: true, is_done: false })
      .eq('id', backlogByName.id)
      .eq('organization_id', orgId)

    return backlogByName.id as string
  }

  const { data: stages } = await supabase
    .from('workflow_stages')
    .select('id,stage_order')
    .eq('phase_id', phaseId)
    .eq('organization_id', orgId)
    .order('stage_order', { ascending: true })

  if ((stages ?? []).length > 0) {
    const sorted = [...(stages ?? [])].sort((a: any, b: any) => (a.stage_order ?? 0) - (b.stage_order ?? 0))
    for (let i = sorted.length - 1; i >= 0; i--) {
      const s = sorted[i]
      await supabase
        .from('workflow_stages')
        .update({ stage_order: Number(s.stage_order ?? 0) + 1, is_backlog: false })
        .eq('id', s.id)
        .eq('organization_id', orgId)
    }

    const { data: inserted } = await supabase
      .from('workflow_stages')
      .insert({
        organization_id: orgId,
        phase_id: phaseId,
        name: 'Backlog',
        stage_order: 0,
        is_done: false,
        is_backlog: true,
        wip_limit: null,
      })
      .select('id')
      .single()

    return inserted?.id as string | null
  }

  const rows = [
    { name: 'Backlog', stage_order: 0, is_done: false, is_backlog: true, wip_limit: null },
    { name: 'To Do', stage_order: 1, is_done: false, is_backlog: false, wip_limit: null },
    { name: 'In Progress', stage_order: 2, is_done: false, is_backlog: false, wip_limit: null },
    { name: 'Done', stage_order: 3, is_done: true, is_backlog: false, wip_limit: null },
  ].map((s) => ({ ...s, organization_id: orgId, phase_id: phaseId }))

  const { data: inserted } = await supabase
    .from('workflow_stages')
    .insert(rows)
    .select('id,stage_order')
    .order('stage_order', { ascending: true })

  const backlog = (inserted ?? []).find((r: any) => r.stage_order === 0)
  return backlog?.id as string | null
}

async function ensureSprintStartStageId(supabase: any, orgId: string, phaseId: string) {
  const { data: stages } = await supabase
    .from('workflow_stages')
    .select('id,stage_order,is_backlog,is_done')
    .eq('phase_id', phaseId)
    .eq('organization_id', orgId)
    .order('stage_order', { ascending: true })

  const start =
    (stages ?? []).find((s: any) => !s.is_backlog && !s.is_done) ??
    (stages ?? []).find((s: any) => !s.is_backlog)
  if (start?.id) return start.id as string

  const maxOrder = Math.max(-1, ...(stages ?? []).map((s: any) => Number(s.stage_order ?? 0)))
  const { data: inserted } = await supabase
    .from('workflow_stages')
    .insert({
      organization_id: orgId,
      phase_id: phaseId,
      name: 'To Do',
      stage_order: maxOrder + 1,
      is_done: false,
      is_backlog: false,
      wip_limit: null,
    })
    .select('id')
    .single()

  return inserted?.id as string | null
}

export default async function ProcessSprintDetailsPage({
  params,
}: {
  params: { id: string; phaseId: string; processId: string; sprintId: string }
}) {
  const tenantSlug = getTenantSlug()
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const orgId = tenantSlug
    ? (await supabase.from('organizations').select('id').eq('slug', tenantSlug).maybeSingle()).data?.id ?? null
    : await resolvePrimaryOrgIdForUser(supabase as any, user.id)

  if (!orgId) redirect('/onboarding')

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', params.id)
    .eq('organization_id', orgId)
    .maybeSingle()
  if (!project) notFound()

  const { data: phase } = await supabase
    .from('sdlc_phases')
    .select('id')
    .eq('id', params.phaseId)
    .eq('project_id', project.id)
    .maybeSingle()
  if (!phase) notFound()

  const { data: process } = await supabase
    .from('phase_processes')
    .select('id,name,methodology')
    .eq('id', params.processId)
    .eq('phase_id', phase.id)
    .eq('organization_id', orgId)
    .maybeSingle()
  if (!process) notFound()

  if (process.methodology !== 'scrum') {
    return redirect(`/dashboard/projects/${params.id}/phases/${params.phaseId}/processes/${process.id}/board`)
  }

  const { data: sprint } = await supabase
    .from('sprints')
    .select('id,name,start_date,end_date,status,story_points_total,process_id')
    .eq('id', params.sprintId)
    .eq('project_id', project.id)
    .eq('phase_id', phase.id)
    .eq('organization_id', orgId)
    .maybeSingle()
  if (!sprint) notFound()
  if (sprint.process_id !== process.id) notFound()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id,title,description,priority,story_points,completed_at,position')
    .eq('project_id', project.id)
    .eq('organization_id', orgId)
    .eq('process_id', process.id)
    .eq('sprint_id', sprint.id)
    .order('position', { ascending: true })

  const backlogStageId = await ensureBacklogStageId(supabase as any, orgId, phase.id)
  const sprintStartStageId = await ensureSprintStartStageId(supabase as any, orgId, phase.id)

  return (
    <SprintDetailsPageClient
      projectId={project.id}
      phaseId={phase.id}
      processId={process.id}
      backlogStageId={backlogStageId ?? undefined}
      sprintStartStageId={sprintStartStageId ?? undefined}
      sprint={sprint as any}
      tasks={(tasks ?? []) as any}
    />
  )
}


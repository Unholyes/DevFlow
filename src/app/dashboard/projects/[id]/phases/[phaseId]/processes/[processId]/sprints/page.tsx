import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { SprintsPageClient, type SprintWithStats } from '@/components/sprints/sprints-page-client'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'

export default async function ProcessSprintsPage({
  params,
}: {
  params: { id: string; phaseId: string; processId: string }
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

  const { data: sprints } = await supabase
    .from('sprints')
    .select('id,name,start_date,end_date,status,story_points_total')
    .eq('project_id', project.id)
    .eq('phase_id', phase.id)
    .eq('organization_id', orgId)
    .eq('process_id', process.id)
    .order('start_date', { ascending: false })

  const { data: backlogTasks } = await supabase
    .from('tasks')
    .select('id,title,description,priority,story_points,position')
    .eq('project_id', project.id)
    .eq('organization_id', orgId)
    .eq('process_id', process.id)
    .is('sprint_id', null)
    .order('position', { ascending: true })
    .limit(10)

  const sprintIds = (sprints ?? []).map((s) => s.id)
  let tasksBySprint: Record<string, { total: number; completed: number }> = {}

  if (sprintIds.length) {
    const { data: sprintTasks } = await supabase
      .from('tasks')
      .select('sprint_id,completed_at')
      .eq('process_id', process.id)
      .in('sprint_id', sprintIds)

    tasksBySprint = (sprintTasks ?? []).reduce(
      (acc, t) => {
        if (!t.sprint_id) return acc
        acc[t.sprint_id] ||= { total: 0, completed: 0 }
        acc[t.sprint_id].total += 1
        if (t.completed_at) acc[t.sprint_id].completed += 1
        return acc
      },
      {} as Record<string, { total: number; completed: number }>
    )
  }

  const sprintsWithStats: SprintWithStats[] = (sprints ?? []).map((s) => {
    const stats = tasksBySprint[s.id] || { total: 0, completed: 0 }
    return {
      ...s,
      tasks_total: stats.total,
      tasks_completed: stats.completed,
    } as SprintWithStats
  })

  return (
    <SprintsPageClient
      projectId={project.id}
      phaseId={phase.id}
      processId={process.id}
      processName={process.name}
      processMethod={process.methodology}
      sprints={sprintsWithStats}
      backlogTasks={(backlogTasks ?? []) as any}
    />
  )
}


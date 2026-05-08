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

function dateOnly(iso: string | null | undefined): string | null {
  if (!iso) return null
  const s = String(iso).trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  return s
}

export type CalendarApiItem = {
  id: string
  kind: 'task' | 'sprint' | 'project'
  date: string
  title: string
  subtitle: string
  projectId: string
  href: string
}

/**
 * Personal calendar: task due dates (assigned to you), sprint start/end on relevant projects,
 * and project target dates for projects you touch (or org projects with due dates if you have no tasks yet).
 */
export async function GET() {
  const supabase = createClient()

  try {
    const orgId = await resolveOrgId(supabase)
    if (!orgId) return NextResponse.json({ items: [] as CalendarApiItem[] })

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ items: [] as CalendarApiItem[] })

    const { data: taskRows, error: taskErr } = await supabase
      .from('tasks')
      .select('id,title,due_date,project_id')
      .eq('organization_id', orgId)
      .eq('assignee_id', user.id)
      .not('due_date', 'is', null)

    if (taskErr) {
      console.error('[GET /api/me/calendar] tasks', taskErr)
    }

    const tasks = taskRows ?? []
    const projectIdsFromTasks = [...new Set(tasks.map((t) => t.project_id).filter(Boolean))] as string[]

    const { data: projectList, error: projErr } =
      projectIdsFromTasks.length > 0
        ? await supabase.from('projects').select('id,name,due_date').in('id', projectIdsFromTasks)
        : await supabase
            .from('projects')
            .select('id,name,due_date')
            .eq('organization_id', orgId)
            .not('due_date', 'is', null)
            .order('due_date', { ascending: true })
            .limit(30)

    if (projErr) console.error('[GET /api/me/calendar] projects', projErr)

    const projects = projectList ?? []
    const projectById = Object.fromEntries(projects.map((p) => [p.id, p]))

    let sprintQuery = supabase
      .from('sprints')
      .select('id,name,start_date,end_date,project_id,phase_id,process_id,status')
      .eq('organization_id', orgId)
      .in('status', ['planned', 'active'])
      .order('end_date', { ascending: true })
      .limit(80)

    if (projectIdsFromTasks.length > 0) {
      sprintQuery = sprintQuery.in('project_id', projectIdsFromTasks)
    }

    const { data: sprintRows, error: sprintErr } = await sprintQuery
    if (sprintErr) console.error('[GET /api/me/calendar] sprints', sprintErr)

    const sprints = sprintRows ?? []

    const sprintProjectIds = [...new Set(sprints.map((s) => s.project_id).filter(Boolean))] as string[]
    const missingNames = sprintProjectIds.filter((id) => !projectById[id])
    if (missingNames.length > 0) {
      const { data: extraProjects } = await supabase.from('projects').select('id,name,due_date').in('id', missingNames)
      for (const p of extraProjects ?? []) {
        projectById[p.id] = { ...(projectById[p.id] ?? p), id: p.id, name: p.name, due_date: p.due_date }
      }
    }

    const items: CalendarApiItem[] = []

    for (const t of tasks) {
      const d = dateOnly(t.due_date as string)
      if (!d) continue
      const p = t.project_id ? projectById[t.project_id as string] : null
      const projectName = p?.name ?? 'Project'
      items.push({
        id: `task-${t.id}`,
        kind: 'task',
        date: d,
        title: String(t.title ?? 'Task').trim() || 'Task',
        subtitle: projectName,
        projectId: String(t.project_id ?? ''),
        href: `/dashboard/tasks?task=${t.id}`,
      })
    }

    for (const p of projects) {
      const d = dateOnly(p.due_date as string | null)
      if (!d) continue
      items.push({
        id: `project-${p.id}`,
        kind: 'project',
        date: d,
        title: `Project due: ${String(p.name ?? 'Project').trim()}`,
        subtitle: 'Project target date',
        projectId: p.id,
        href: `/dashboard/projects/${p.id}`,
      })
    }

    for (const s of sprints) {
      const pid = String(s.project_id ?? '')
      const pname = projectById[pid]?.name ?? 'Project'
      const phaseId = s.phase_id as string | null | undefined
      const processId = s.process_id as string | null | undefined
      const sprintHref =
        pid && phaseId && processId
          ? `/dashboard/projects/${pid}/phases/${phaseId}/processes/${processId}/sprints/${s.id}`
          : pid
            ? `/dashboard/projects/${pid}`
            : '/dashboard/calendar'

      const start = dateOnly(s.start_date as string)
      const end = dateOnly(s.end_date as string)

      if (start) {
        items.push({
          id: `sprint-start-${s.id}`,
          kind: 'sprint',
          date: start,
          title: `Sprint starts: ${String(s.name ?? 'Sprint').trim()}`,
          subtitle: pname,
          projectId: pid,
          href: sprintHref,
        })
      }
      if (end) {
        items.push({
          id: `sprint-end-${s.id}`,
          kind: 'sprint',
          date: end,
          title: `Sprint ends: ${String(s.name ?? 'Sprint').trim()}`,
          subtitle: pname,
          projectId: pid,
          href: sprintHref,
        })
      }
    }

    return NextResponse.json({ items })
  } catch (e) {
    console.error('GET /api/me/calendar', e)
    return NextResponse.json({ items: [] as CalendarApiItem[] })
  }
}

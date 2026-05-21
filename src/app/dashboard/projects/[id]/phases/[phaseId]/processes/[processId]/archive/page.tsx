import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import { KanbanProcessChrome } from '@/components/processes/kanban-process-chrome'
import { KanbanArchivePageClient } from '@/components/kanban/kanban-archive-page-client'
import { processWorkspacePath } from '@/lib/processes/process-workspace-routes'
import { loadProjectPhasesGatingContext } from '@/lib/projects/load-project-phases-gating'
import { isPhaseLockedForProject } from '@/lib/projects/phase-gating'
import { isMissingArchivedAtColumnError } from '@/lib/tasks/task-archive'

const ARCHIVE_TASK_COLUMNS =
  'id,title,priority,completed_at,archived_at,workflow_stage_id,task_type'

const ARCHIVE_TASK_COLUMNS_NO_TYPE =
  'id,title,priority,completed_at,archived_at,workflow_stage_id'

type ArchivedTaskRow = {
  id: string
  title: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  completed_at: string | null
  archived_at: string | null
  workflow_stage_id: string
  task_type?: string | null
}

export default async function ProcessArchivePage({
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
    .select('id,phase_gating_enabled')
    .eq('id', params.id)
    .eq('organization_id', orgId)
    .maybeSingle()
  if (!project) notFound()

  const { data: phases } = await supabase
    .from('sdlc_phases')
    .select('id,status,order_index,is_gated')
    .eq('project_id', project.id)
    .order('order_index', { ascending: true })

  const phase = (phases ?? []).find((p) => p.id === params.phaseId)
  if (!phase) notFound()

  const gatingContext = await loadProjectPhasesGatingContext(
    supabase,
    orgId,
    project.id,
    !!project.phase_gating_enabled
  )
  const isLocked = isPhaseLockedForProject(
    gatingContext.phases,
    gatingContext.phaseGatingEnabled,
    phase.id
  )

  if (isLocked) {
    return redirect(`/dashboard/projects/${params.id}/phases/${params.phaseId}`)
  }

  const { data: process } = await supabase
    .from('phase_processes')
    .select('id,name,methodology')
    .eq('id', params.processId)
    .eq('phase_id', phase.id)
    .eq('organization_id', orgId)
    .maybeSingle()
  if (!process) notFound()

  if (process.methodology !== 'kanban') {
    return redirect(processWorkspacePath(params.id, phase.id, process.id, process.methodology))
  }

  const { data: allProcesses } = await supabase
    .from('phase_processes')
    .select('id,name,methodology,order_index')
    .eq('phase_id', phase.id)
    .order('order_index', { ascending: true })

  const { data: stages } = await supabase
    .from('workflow_stages')
    .select('id,name')
    .eq('phase_id', phase.id)
    .eq('organization_id', orgId)

  const stageNames = Object.fromEntries((stages ?? []).map((s) => [s.id, s.name]))

  const archiveQuery = (cols: string) =>
    supabase
      .from('tasks')
      .select(cols)
      .eq('project_id', project.id)
      .eq('organization_id', orgId)
      .eq('process_id', process.id)
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false })

  let archiveRes = await archiveQuery(ARCHIVE_TASK_COLUMNS)
  if (archiveRes.error) {
    const msg = String(archiveRes.error.message ?? '')
    const code = (archiveRes.error as { code?: string }).code
    if (msg.toLowerCase().includes('task_type') || code === '42703') {
      archiveRes = await archiveQuery(ARCHIVE_TASK_COLUMNS_NO_TYPE)
    }
  }

  let tasks: ArchivedTaskRow[] = []

  if (
    archiveRes.error &&
    isMissingArchivedAtColumnError(String(archiveRes.error.message ?? ''), (archiveRes.error as { code?: string }).code)
  ) {
    tasks = []
  } else if (!archiveRes.error) {
    tasks = (archiveRes.data ?? []) as ArchivedTaskRow[]
  }

  return (
    <KanbanProcessChrome
      projectId={project.id}
      phaseId={phase.id}
      processId={process.id}
      processName={process.name}
      currentTab="archive"
      allProcesses={(allProcesses ?? []) as { id: string; name: string; methodology: string }[]}
    >
      <KanbanArchivePageClient
        projectId={project.id}
        phaseId={phase.id}
        processId={process.id}
        tasks={tasks}
        stageNames={stageNames}
      />
    </KanbanProcessChrome>
  )
}

import type { SupabaseClient } from '@supabase/supabase-js'

/** Enrich task rows with project, workflow stage, and phase process for navigator UIs. */
export async function enrichTasksForNavigator(
  supabase: SupabaseClient,
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

  return rows.map((t: Record<string, unknown>) => ({
    ...t,
    project: t.project_id ? projectById[t.project_id as string] ?? null : null,
    workflow_stage: t.workflow_stage_id ? stageById[t.workflow_stage_id as string] ?? null : null,
    phase_process: t.process_id ? processById[t.process_id as string] ?? null : null,
  }))
}

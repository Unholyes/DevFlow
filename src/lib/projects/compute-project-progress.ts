import type { SupabaseClient } from '@supabase/supabase-js'

export type ProjectProgressAgg = {
  progress: number
  tasksCount: number
  completedTasks: number
}

function emptyAgg(): ProjectProgressAgg {
  return { progress: 0, tasksCount: 0, completedTasks: 0 }
}

function percentFromCounts(done: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((done / total) * 100)))
}

/**
 * Task completion % per project: completed_at set OR task is on a workflow stage marked is_done.
 * Matches phase/process progress on the project detail pages.
 */
export async function computeProjectProgressByIds(
  supabase: SupabaseClient,
  organizationId: string,
  projects: Array<{ id: string; status?: string | null }>
): Promise<Map<string, ProjectProgressAgg>> {
  const result = new Map<string, ProjectProgressAgg>()
  if (projects.length === 0) return result

  for (const p of projects) {
    if (p.status === 'completed') {
      result.set(p.id, { progress: 100, tasksCount: 0, completedTasks: 0 })
    } else {
      result.set(p.id, emptyAgg())
    }
  }

  const projectIds = projects.map((p) => p.id)

  const { data: taskRows, error: tasksError } = await supabase
    .from('tasks')
    .select('project_id,workflow_stage_id,completed_at')
    .eq('organization_id', organizationId)
    .in('project_id', projectIds)

  if (tasksError) {
    console.error('computeProjectProgressByIds tasks:', tasksError)
    return result
  }

  const stageIds = [
    ...new Set(
      (taskRows ?? [])
        .map((t) => t.workflow_stage_id as string | null)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ]

  const doneStageIds = new Set<string>()
  if (stageIds.length > 0) {
    const { data: stages, error: stagesError } = await supabase
      .from('workflow_stages')
      .select('id,is_done')
      .eq('organization_id', organizationId)
      .in('id', stageIds)

    if (stagesError) {
      console.error('computeProjectProgressByIds stages:', stagesError)
    } else {
      for (const s of stages ?? []) {
        if (s.is_done) doneStageIds.add(s.id as string)
      }
    }
  }

  const counts = new Map<string, { total: number; done: number }>()
  for (const pid of projectIds) counts.set(pid, { total: 0, done: 0 })

  for (const row of taskRows ?? []) {
    const pid = row.project_id as string
    if (!counts.has(pid)) continue
    const agg = counts.get(pid)!
    agg.total += 1
    const stageId = row.workflow_stage_id as string | null
    if (row.completed_at != null || (stageId && doneStageIds.has(stageId))) {
      agg.done += 1
    }
    counts.set(pid, agg)
  }

  for (const p of projects) {
    if (p.status === 'completed') continue
    const { total, done } = counts.get(p.id) ?? { total: 0, done: 0 }
    result.set(p.id, {
      progress: percentFromCounts(done, total),
      tasksCount: total,
      completedTasks: done,
    })
  }

  return result
}

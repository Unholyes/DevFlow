import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveBacklogStageIdForPhase } from '@/lib/sprints/resolve-backlog-stage-id'
import {
  isTaskDoneForSprintClose,
  type SprintTaskCompletionRow,
} from '@/lib/sprints/sprint-task-completion'
import {
  isResumableWorkflowStage,
  resolveWorkflowStageForSprintAssignment,
} from '@/lib/tasks/resolve-sprint-resume-stage'

const nowIso = () => new Date().toISOString()

export type UnfinishedSprintAction = 'backlog' | 'next_sprint'

export type ApplySprintCloseResult = {
  unfinishedMoved: number
  unfinishedLeftOnSprint: number
  targetSprintId: string | null
  /** Unfinished tasks sent to backlog for Create Sprint planning (`?tasks=`). */
  deferredToPlan: boolean
  carryoverTaskIds: string[]
}

async function recalculateSprintStoryPoints(
  supabase: SupabaseClient,
  organizationId: string,
  sprintId: string,
): Promise<void> {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('story_points')
    .eq('sprint_id', sprintId)
    .eq('organization_id', organizationId)

  if (error) throw error

  const total = (tasks ?? []).reduce(
    (sum, t) => sum + Number((t as { story_points?: number | null }).story_points ?? 0),
    0,
  )

  const { error: updateError } = await supabase
    .from('sprints')
    .update({ story_points_total: total })
    .eq('id', sprintId)
    .eq('organization_id', organizationId)

  if (updateError) throw updateError
}

async function assertCarryoverTargetSprint(
  supabase: SupabaseClient,
  params: {
    organizationId: string
    projectId: string
    phaseId: string
    processId: string | null
    closingSprintId: string
    targetSprintId: string
  },
): Promise<{ id: string; status: string }> {
  const { data: target, error } = await supabase
    .from('sprints')
    .select('id,status,project_id,phase_id,process_id')
    .eq('id', params.targetSprintId)
    .eq('organization_id', params.organizationId)
    .maybeSingle()

  if (error) throw error
  if (!target?.id) {
    throw new Error('Target sprint not found')
  }

  if (String(target.id) === params.closingSprintId) {
    throw new Error('Cannot carry tasks into the sprint being closed')
  }

  if (String((target as { project_id?: string }).project_id) !== params.projectId) {
    throw new Error('Target sprint does not belong to this project')
  }

  if (String((target as { phase_id?: string }).phase_id) !== params.phaseId) {
    throw new Error('Target sprint does not belong to this phase')
  }

  const targetProcessId = (target as { process_id?: string | null }).process_id
  const targetProcess = targetProcessId ? String(targetProcessId) : null
  if (targetProcess !== params.processId) {
    throw new Error('Target sprint does not belong to this process')
  }

  const status = String((target as { status?: string }).status ?? '')
  if (status !== 'draft') {
    throw new Error(
      'Carryover can only target a sprint draft from Create Sprint. Choose "Plan a new sprint" or Return to backlog.',
    )
  }

  return { id: String(target.id), status }
}

async function loadStageIsDoneMap(
  supabase: SupabaseClient,
  organizationId: string,
  phaseId: string,
  stageIds: string[],
): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>()
  if (stageIds.length === 0) return map

  const { data: stages, error } = await supabase
    .from('workflow_stages')
    .select('id,is_done')
    .eq('organization_id', organizationId)
    .eq('phase_id', phaseId)
    .in('id', stageIds)

  if (error) throw error
  for (const s of stages ?? []) {
    map.set(String(s.id), Boolean((s as { is_done?: boolean }).is_done))
  }
  return map
}

async function moveUnfinishedTaskToBacklog(
  supabase: SupabaseClient,
  params: {
    organizationId: string
    phaseId: string
    taskId: string
    backlogStageId: string
    currentStageId: string | null
  },
): Promise<void> {
  const row: Record<string, unknown> = {
    sprint_id: null,
    workflow_stage_id: params.backlogStageId,
    completed_at: null,
    completed_by_id: null,
    current_stage_entered_at: nowIso(),
    updated_at: nowIso(),
  }

  if (
    params.currentStageId &&
    (await isResumableWorkflowStage(
      supabase,
      params.organizationId,
      params.phaseId,
      params.currentStageId,
    ))
  ) {
    row.last_sprint_workflow_stage_id = params.currentStageId
  }

  const { error } = await supabase
    .from('tasks')
    .update(row)
    .eq('id', params.taskId)
    .eq('organization_id', params.organizationId)

  if (error) throw error
}

async function assignUnfinishedTaskToSprint(
  supabase: SupabaseClient,
  params: {
    organizationId: string
    phaseId: string
    taskId: string
    targetSprintId: string
    currentStageId: string | null
    sprintStartStageId: string | null
  },
): Promise<void> {
  const resumeFrom = params.currentStageId
  const { workflowStageId, clearResume } = await resolveWorkflowStageForSprintAssignment(
    supabase,
    params.organizationId,
    params.phaseId,
    { last_sprint_workflow_stage_id: resumeFrom },
    params.sprintStartStageId,
  )

  const row: Record<string, unknown> = {
    sprint_id: params.targetSprintId,
    completed_at: null,
    completed_by_id: null,
    updated_at: nowIso(),
    current_stage_entered_at: nowIso(),
  }

  if (workflowStageId) {
    row.workflow_stage_id = workflowStageId
  }

  if (clearResume) {
    row.last_sprint_workflow_stage_id = null
  } else if (
    resumeFrom &&
    (await isResumableWorkflowStage(supabase, params.organizationId, params.phaseId, resumeFrom))
  ) {
    row.last_sprint_workflow_stage_id = resumeFrom
  }

  const { error } = await supabase
    .from('tasks')
    .update(row)
    .eq('id', params.taskId)
    .eq('organization_id', params.organizationId)

  if (error) throw error
}

/**
 * After closing a sprint: move unfinished tasks per user choice; completed tasks stay on the closed sprint.
 */
export async function applyUnfinishedTasksAfterSprintClose(
  supabase: SupabaseClient,
  params: {
    organizationId: string
    sprintId: string
    phaseId: string
    projectId: string
    processId: string | null
    unfinishedAction: UnfinishedSprintAction
    /** Required when unfinishedAction is next_sprint (unless deferCarryoverToPlan). */
    targetSprintId?: string | null
    /** Put unfinished tasks on backlog and return ids for Create Sprint plan (`?tasks=`). */
    deferCarryoverToPlan?: boolean
    sprintStartStageId?: string | null
  },
): Promise<ApplySprintCloseResult> {
  const { data: sprintTasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id,completed_at,workflow_stage_id')
    .eq('sprint_id', params.sprintId)
    .eq('organization_id', params.organizationId)

  if (tasksError) throw tasksError

  const stageIds = [
    ...new Set(
      (sprintTasks ?? [])
        .map((t) => (t as { workflow_stage_id?: string | null }).workflow_stage_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  ]

  const stageIsDone = await loadStageIsDoneMap(
    supabase,
    params.organizationId,
    params.phaseId,
    stageIds,
  )

  const unfinished = (sprintTasks ?? []).filter(
    (t) => !isTaskDoneForSprintClose(t as SprintTaskCompletionRow, stageIsDone),
  )

  if (unfinished.length === 0) {
    return {
      unfinishedMoved: 0,
      unfinishedLeftOnSprint: 0,
      targetSprintId: null,
      deferredToPlan: false,
      carryoverTaskIds: [],
    }
  }

  const backlogStageId = await resolveBacklogStageIdForPhase(
    supabase,
    params.organizationId,
    params.phaseId,
  )

  const unfinishedIds = unfinished.map((t) => String((t as { id: string }).id))

  if (params.unfinishedAction === 'next_sprint') {
    if (params.deferCarryoverToPlan) {
      let moved = 0
      for (const task of unfinished) {
        const taskId = String((task as { id: string }).id)
        const currentStageId = ((task as { workflow_stage_id?: string | null }).workflow_stage_id ??
          null) as string | null
        if (backlogStageId) {
          await moveUnfinishedTaskToBacklog(supabase, {
            organizationId: params.organizationId,
            phaseId: params.phaseId,
            taskId,
            backlogStageId,
            currentStageId,
          })
          moved += 1
        }
      }
      return {
        unfinishedMoved: moved,
        unfinishedLeftOnSprint: unfinished.length - moved,
        targetSprintId: null,
        deferredToPlan: true,
        carryoverTaskIds: unfinishedIds,
      }
    }

    const targetId = String(params.targetSprintId ?? '').trim()
    if (!targetId) {
      throw new Error(
        'Select a sprint draft from Create Sprint, or choose "Plan a new sprint", before completing.',
      )
    }

    await assertCarryoverTargetSprint(supabase, {
      organizationId: params.organizationId,
      projectId: params.projectId,
      phaseId: params.phaseId,
      processId: params.processId,
      closingSprintId: params.sprintId,
      targetSprintId: targetId,
    })

    let moved = 0
    for (const task of unfinished) {
      const taskId = String((task as { id: string }).id)
      const currentStageId = ((task as { workflow_stage_id?: string | null }).workflow_stage_id ??
        null) as string | null

      await assignUnfinishedTaskToSprint(supabase, {
        organizationId: params.organizationId,
        phaseId: params.phaseId,
        taskId,
        targetSprintId: targetId,
        currentStageId,
        sprintStartStageId: params.sprintStartStageId ?? null,
      })
      moved += 1
    }

    await recalculateSprintStoryPoints(supabase, params.organizationId, targetId)

    return {
      unfinishedMoved: moved,
      unfinishedLeftOnSprint: unfinished.length - moved,
      targetSprintId: targetId,
      deferredToPlan: false,
      carryoverTaskIds: [],
    }
  }

  let moved = 0

  for (const task of unfinished) {
    const taskId = String((task as { id: string }).id)
    const currentStageId = ((task as { workflow_stage_id?: string | null }).workflow_stage_id ??
      null) as string | null

    if (backlogStageId) {
      await moveUnfinishedTaskToBacklog(supabase, {
        organizationId: params.organizationId,
        phaseId: params.phaseId,
        taskId,
        backlogStageId,
        currentStageId,
      })
      moved += 1
    } else {
      const { error } = await supabase
        .from('tasks')
        .update({
          sprint_id: null,
          completed_at: null,
          completed_by_id: null,
          updated_at: nowIso(),
        })
        .eq('id', taskId)
        .eq('organization_id', params.organizationId)
      if (error) throw error
      moved += 1
    }
  }

  return {
    unfinishedMoved: moved,
    unfinishedLeftOnSprint: unfinished.length - moved,
    targetSprintId: null,
    deferredToPlan: false,
    carryoverTaskIds: [],
  }
}

import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import { NextResponse } from 'next/server'
import { resolveAssigneeIdForTask, resolveTeamIdForTask } from '@/lib/tasks/validate-task-assignments'
import { enrichTasksForNavigator } from '@/lib/tasks/enrich-for-navigator'
import { parseTaskTypeFromBody } from '@/lib/tasks/task-type'
import {
  notifyTaskAssigned,
  notifyTaskCreated,
  notifyTaskEdited,
  notifyTaskDeleted,
  notifyProcessCompleted,
} from '@/lib/notifications/create-notifications'
import { loadTaskNotificationContext } from '@/lib/notifications/load-task-context'
import {
  loadPhaseIdForSprint,
  resolveWorkflowStageForSprintAssignment,
} from '@/lib/tasks/resolve-sprint-resume-stage'
import {
  DUPLICATE_TASK_TITLE_IN_PROCESS,
  findDuplicateTaskTitleInProcess,
  loadPhaseIdForWorkflowStage,
  normalizeTaskTitle,
} from '@/lib/tasks/validate-task-title'
import { userCanManageBacklog } from '@/lib/permissions/backlog-permissions'
import { assertSprintAllowsBoardMoves } from '@/lib/sprints/assert-sprint-board-movable'
import { resolveBacklogStageIdForPhase } from '@/lib/sprints/resolve-backlog-stage-id'

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && (error as any).code === '23505'
}

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

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const assignee = searchParams.get('assignee')
  const projectId = searchParams.get('projectId')
  const sprintId = searchParams.get('sprintId')
  const processId = searchParams.get('processId')

  try {
    const orgId = await resolveOrgId(supabase)
    if (!orgId) return NextResponse.json({ data: [] })

    const teamIdFilter = searchParams.get('teamId')
    const teamIdOk = teamIdFilter && uuidRe.test(teamIdFilter)

    /** Tasks assigned to the signed-in user (any sprint/backlog). Used by /dashboard/tasks. */
    if (assignee === 'me') {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ data: [] })

      let q = supabase
        .from('tasks')
        .select('*')
        .eq('organization_id', orgId)
        .eq('assignee_id', user.id)

      if (projectId && uuidRe.test(projectId)) {
        q = q.eq('project_id', projectId)
      }
      if (processId && uuidRe.test(processId)) {
        q = q.eq('process_id', processId)
      }
      if (teamIdOk) {
        q = q.eq('team_id', teamIdFilter!)
      }

      const { data: tasks, error } = await q.order('updated_at', { ascending: false }).limit(400)

      if (error) {
        console.error('Supabase error (assignee=me):', error)
        return NextResponse.json({ data: [] })
      }

      const enriched = await enrichTasksForNavigator(supabase, tasks ?? [])
      return NextResponse.json({ data: enriched })
    }

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('organization_id', orgId)

    // Skip project_id filter if it's not a valid UUID (for development with mock data)
    if (projectId && uuidRe.test(projectId)) {
      query = query.eq('project_id', projectId)
    }

    if (sprintId) {
      query = query.eq('sprint_id', sprintId)
    } else {
      // If no sprint specified, get backlog tasks (no sprint assigned)
      query = query.is('sprint_id', null)
    }

    if (processId && uuidRe.test(processId)) {
      query = query.eq('process_id', processId)
    }

    if (teamIdOk) {
      query = query.eq('team_id', teamIdFilter!)
    }

    const { data, error } = await query.order('position', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      // Return empty array on RLS error instead of crashing
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    // Return empty array on any error
    return NextResponse.json({ data: [] })
  }
}

export async function POST(request: Request) {
  const supabase = createClient()
  
  try {
    const orgId = await resolveOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Missing tenant context', data: null }, { status: 400 })

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', data: null }, { status: 401 })

    const body = await request.json();
    const {
      project_id,
      process_id,
      title,
      description,
      priority,
      story_points: storyPointsRaw,
      due_date,
      assignee_id,
      workflow_stage_id,
      phase_id: bodyPhaseIdRaw,
      sprint_id,
      size_band: sizeBandRaw,
      service_class: serviceClassRaw,
      team_id: teamIdRaw,
      task_type: taskTypeRaw,
    } = body;

    const parsedTaskType = parseTaskTypeFromBody(taskTypeRaw)
    if (taskTypeRaw != null && taskTypeRaw !== '' && parsedTaskType === null) {
      return NextResponse.json({ error: 'Invalid task_type', data: null }, { status: 400 })
    }
    const task_type = parsedTaskType ?? 'task'

    const story_points =
      storyPointsRaw === null
        ? null
        : storyPointsRaw === undefined
          ? 0
          : (() => {
              const n = Number(storyPointsRaw)
              return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0
            })()

    const sizeBands = new Set(['xs', 's', 'm', 'l', 'xl'])
    const size_band =
      sizeBandRaw == null || sizeBandRaw === ''
        ? null
        : sizeBands.has(String(sizeBandRaw).toLowerCase())
          ? String(sizeBandRaw).toLowerCase()
          : null

    const serviceClasses = new Set(['standard', 'fixed_date', 'expedite'])
    const service_class =
      serviceClassRaw == null || serviceClassRaw === ''
        ? 'standard'
        : serviceClasses.has(String(serviceClassRaw))
          ? String(serviceClassRaw)
          : 'standard'

    // Skip project_id if it's not a valid UUID (for development)
    const validProjectId = project_id && project_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? project_id : null;
    if (!validProjectId) {
      return NextResponse.json({ error: 'project_id is required', data: null }, { status: 400 })
    }

    const trimmedTitle = normalizeTaskTitle(title)
    if (!trimmedTitle) {
      return NextResponse.json({ error: 'Task title is required', data: null }, { status: 400 })
    }

    if (!workflow_stage_id || typeof workflow_stage_id !== 'string') {
      return NextResponse.json({ error: 'workflow_stage_id is required', data: null }, { status: 400 })
    }

    const createPhaseId = await loadPhaseIdForWorkflowStage(supabase as any, orgId, workflow_stage_id)
    if (!createPhaseId) {
      return NextResponse.json({ error: 'Invalid workflow stage', data: null }, { status: 400 })
    }

    const { data: createStage } = await supabase
      .from('workflow_stages')
      .select('is_backlog')
      .eq('id', workflow_stage_id)
      .eq('organization_id', orgId)
      .maybeSingle()

    if (createStage?.is_backlog) {
      const allowed = await userCanManageBacklog(supabase, {
        organizationId: orgId,
        userId: user.id,
        projectId: validProjectId,
      })
      if (!allowed) {
        return NextResponse.json(
          { error: 'You do not have permission to manage the backlog', data: null },
          { status: 403 },
        )
      }
    }

    if (bodyPhaseIdRaw != null && bodyPhaseIdRaw !== '') {
      const bodyPhaseId = String(bodyPhaseIdRaw)
      if (bodyPhaseId !== createPhaseId) {
        return NextResponse.json(
          { error: 'Workflow stage does not belong to the specified phase.', data: null },
          { status: 400 },
        )
      }
    }

    const validProcessId =
      process_id && uuidRe.test(String(process_id)) ? String(process_id) : null

    const duplicateOnCreate = await findDuplicateTaskTitleInProcess(
      supabase as any,
      orgId,
      validProcessId,
      createPhaseId,
      trimmedTitle,
    )
    if (duplicateOnCreate) {
      return NextResponse.json({ error: DUPLICATE_TASK_TITLE_IN_PROCESS, data: null }, { status: 409 })
    }

    const teamResolved = await resolveTeamIdForTask(supabase, orgId, teamIdRaw)
    if (!teamResolved.ok) {
      return NextResponse.json(
        { error: teamResolved.error, code: teamResolved.code, data: null },
        { status: teamResolved.status }
      )
    }

    const assigneeResolved = await resolveAssigneeIdForTask(supabase, orgId, assignee_id)
    if (!assigneeResolved.ok) {
      return NextResponse.json(
        { error: assigneeResolved.error, code: assigneeResolved.code, data: null },
        { status: assigneeResolved.status }
      )
    }

    // Get the highest position for ordering
    let newPosition = 0;
    if (validProjectId) {
      const { data: maxPosition } = await supabase
        .from('tasks')
        .select('position')
        .eq('organization_id', orgId)
        .eq('project_id', validProjectId)
        .eq('process_id', process_id ?? null)
        .order('position', { ascending: false })
        .limit(1)
        .single();
      newPosition = (maxPosition?.position ?? -1) + 1;
    }

    const nowIso = new Date().toISOString()

    const insertRow: Record<string, unknown> = {
      organization_id: orgId,
      project_id: validProjectId,
      process_id: process_id ?? null,
      phase_id: createPhaseId,
      title: trimmedTitle,
      description,
      priority,
      story_points,
      due_date,
      workflow_stage_id,
      sprint_id,
      position: newPosition,
      size_band,
      service_class,
      current_stage_entered_at: nowIso,
      task_type,
      created_by_id: user.id,
      updated_by_id: user.id,
    }
    if (teamResolved.teamId !== undefined) {
      insertRow.team_id = teamResolved.teamId
    }
    if (assigneeResolved.assigneeId !== undefined) {
      insertRow.assignee_id = assigneeResolved.assigneeId
    }

    const { data, error } = await supabase.from('tasks').insert(insertRow).select().single()

    if (error) throw error

    if (data?.id) {
      if (assigneeResolved.assigneeId) {
        const ctx = await loadTaskNotificationContext(supabase, orgId, data.id as string)
        if (ctx) {
          void notifyTaskAssigned({
            supabase,
            organizationId: orgId,
            actorId: user.id,
            assigneeId: ctx.assignee_id,
            task: {
              id: ctx.id,
              title: ctx.title,
              project_id: ctx.project_id,
              phase_id: ctx.phase_id,
              process_id: ctx.process_id,
            },
          })
        }
      }

      void notifyTaskCreated({
        supabase,
        organizationId: orgId,
        actorId: user.id,
        task: {
          id: data.id as string,
          title: data.title as string,
          project_id: data.project_id as string,
          phase_id: data.phase_id as string | null,
          process_id: data.process_id as string | null,
        },
      })
    }

    return NextResponse.json({ data })
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: DUPLICATE_TASK_TITLE_IN_PROCESS, data: null }, { status: 409 })
    }
    console.error('Error creating task:', error)
    return NextResponse.json({ error: 'Failed to create task', data: null }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const supabase = createClient()
  
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Missing tenant context' }, { status: 400 })

    const body = await request.json()
    const { id, ...updates } = body as Record<string, unknown> & { id?: string }

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Task id is required' }, { status: 400 })
    }

    const { data: beforeTask, error: beforeError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle()
    if (beforeError) throw beforeError
    if (!beforeTask) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    if (updates.title !== undefined) {
      const trimmedTitle = normalizeTaskTitle(updates.title)
      if (!trimmedTitle) {
        return NextResponse.json({ error: 'Task title is required' }, { status: 400 })
      }
      updates.title = trimmedTitle

      const titlePhaseId =
        typeof updates.workflow_stage_id === 'string'
          ? await loadPhaseIdForWorkflowStage(supabase as any, orgId, updates.workflow_stage_id)
          : null

      const phaseIdForTitle =
        titlePhaseId ??
        (beforeTask.phase_id as string | null) ??
        (beforeTask.workflow_stage_id
          ? await loadPhaseIdForWorkflowStage(
              supabase as any,
              orgId,
              String(beforeTask.workflow_stage_id),
            )
          : null)

      const processIdForTitle =
        updates.process_id !== undefined
          ? updates.process_id == null || updates.process_id === ''
            ? null
            : String(updates.process_id)
          : (beforeTask.process_id as string | null)

      if (!processIdForTitle && !phaseIdForTitle) {
        return NextResponse.json({ error: 'Task process or phase could not be resolved' }, { status: 400 })
      }

      const duplicateOnUpdate = await findDuplicateTaskTitleInProcess(
        supabase as any,
        orgId,
        processIdForTitle,
        phaseIdForTitle,
        trimmedTitle,
        id,
      )
      if (duplicateOnUpdate) {
        return NextResponse.json({ error: DUPLICATE_TASK_TITLE_IN_PROCESS }, { status: 409 })
      }
    }

    const assigneeChanging = updates.assignee_id !== undefined
    const beforeCtx =
      assigneeChanging && typeof id === 'string'
        ? await loadTaskNotificationContext(supabase, orgId, id)
        : null

    if (updates.team_id !== undefined) {
      const tr = await resolveTeamIdForTask(supabase, orgId, updates.team_id)
      if (!tr.ok) {
        return NextResponse.json({ error: tr.error, code: tr.code }, { status: tr.status })
      }
      updates.team_id = tr.teamId
    }

    if (updates.assignee_id !== undefined) {
      const ar = await resolveAssigneeIdForTask(supabase, orgId, updates.assignee_id)
      if (!ar.ok) {
        return NextResponse.json({ error: ar.error, code: ar.code }, { status: ar.status })
      }
      updates.assignee_id = ar.assigneeId
    }

    const sprintIdUpdate = updates.sprint_id
    const enteringSprint =
      typeof id === 'string' &&
      typeof sprintIdUpdate === 'string' &&
      uuidRe.test(sprintIdUpdate)

    const leavingSprint =
      updates.sprint_id === null &&
      beforeTask.sprint_id != null &&
      String(beforeTask.sprint_id).length > 0

    if (leavingSprint && updates.workflow_stage_id === undefined) {
      const phaseIdForRelease =
        (beforeTask.phase_id as string | null) ??
        (await loadPhaseIdForSprint(supabase as any, orgId, String(beforeTask.sprint_id)))

      if (phaseIdForRelease) {
        const backlogStageId = await resolveBacklogStageIdForPhase(
          supabase as any,
          orgId,
          phaseIdForRelease,
        )
        if (backlogStageId) {
          updates.workflow_stage_id = backlogStageId
          updates.completed_at = null
          updates.current_stage_entered_at = new Date().toISOString()
        }
      }
    }

    if (enteringSprint) {
      const { data: existingForSprint, error: sprintLoadError } = await supabase
        .from('tasks')
        .select('sprint_id,last_sprint_workflow_stage_id,workflow_stage_id')
        .eq('id', id)
        .eq('organization_id', orgId)
        .maybeSingle()

      if (sprintLoadError) throw sprintLoadError

      if (existingForSprint && existingForSprint.sprint_id == null) {
        const phaseId = await loadPhaseIdForSprint(supabase as any, orgId, sprintIdUpdate)
        if (phaseId) {
          const fallbackStageId =
            typeof updates.workflow_stage_id === 'string' ? updates.workflow_stage_id : null
          const { workflowStageId, clearResume } = await resolveWorkflowStageForSprintAssignment(
            supabase as any,
            orgId,
            phaseId,
            {
              last_sprint_workflow_stage_id:
                (existingForSprint.last_sprint_workflow_stage_id as string | null) ?? null,
            },
            fallbackStageId,
          )

          if (workflowStageId) {
            if (workflowStageId !== existingForSprint.workflow_stage_id) {
              updates.current_stage_entered_at = new Date().toISOString()
            }
            updates.workflow_stage_id = workflowStageId
            if (clearResume) {
              updates.last_sprint_workflow_stage_id = null
            }
          }
        }
      }
    }

    if (updates.workflow_stage_id !== undefined && typeof updates.workflow_stage_id === 'string') {
      const { data: existing } = await supabase
        .from('tasks')
        .select('workflow_stage_id,sprint_id')
        .eq('id', id)
        .eq('organization_id', orgId)
        .maybeSingle()

      if (existing && existing.workflow_stage_id !== updates.workflow_stage_id) {
        const sprintIdForMove = (beforeTask.sprint_id as string | null) ?? null
        if (sprintIdForMove) {
          const boardError = await assertSprintAllowsBoardMoves(supabase as any, {
            organizationId: orgId,
            sprintId: sprintIdForMove,
          })
          if (boardError) {
            return NextResponse.json({ error: boardError }, { status: 400 })
          }
        }
        updates.current_stage_entered_at = new Date().toISOString()
      }
    }

    updates.updated_by_id = user.id
    if (updates.completed_at !== undefined) {
      updates.completed_by_id = updates.completed_at ? user.id : null
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) throw error

    if (data?.id) {
      if (assigneeChanging) {
        const newAssignee = (data.assignee_id as string | null) ?? null
        const prevAssignee = beforeCtx?.assignee_id ?? null
        if (newAssignee && newAssignee !== prevAssignee) {
          const ctx = await loadTaskNotificationContext(supabase, orgId, data.id as string)
          if (ctx) {
            void notifyTaskAssigned({
              supabase,
              organizationId: orgId,
              actorId: user.id,
              assigneeId: newAssignee,
              task: {
                id: ctx.id,
                title: ctx.title,
                project_id: ctx.project_id,
                phase_id: ctx.phase_id,
                process_id: ctx.process_id,
              },
            })
          }
        }
      }

      // Check task edits and trigger notifyTaskEdited
      const changedFields: string[] = []
      if (updates.title !== undefined && updates.title !== beforeTask.title) {
        changedFields.push(`title to “${updates.title}”`)
      }
      if (updates.description !== undefined && updates.description !== beforeTask.description) {
        changedFields.push(`description`)
      }
      if (updates.priority !== undefined && updates.priority !== beforeTask.priority) {
        changedFields.push(`priority to “${updates.priority}”`)
      }
      if (updates.story_points !== undefined && updates.story_points !== beforeTask.story_points) {
        changedFields.push(`story points to ${updates.story_points ?? 'none'}`)
      }
      if (updates.due_date !== undefined && updates.due_date !== beforeTask.due_date) {
        changedFields.push(`due date to ${updates.due_date ?? 'none'}`)
      }
      if (updates.team_id !== undefined && updates.team_id !== beforeTask.team_id) {
        changedFields.push(`assigned team`)
      }
      if (updates.assignee_id !== undefined && updates.assignee_id !== beforeTask.assignee_id) {
        changedFields.push(`assignee`)
      }

      if (changedFields.length > 0) {
        void notifyTaskEdited({
          supabase,
          organizationId: orgId,
          actorId: user.id,
          task: {
            id: beforeTask.id,
            title: (updates.title as string | undefined) ?? beforeTask.title,
            project_id: beforeTask.project_id,
            phase_id: beforeTask.phase_id,
            process_id: beforeTask.process_id,
          },
          changesPreview: `changed ${changedFields.join(', ')}`,
        })
      }

      // Check dynamic process completion
      const updatedProcessId = (data.process_id as string | null) ?? null
      if (updatedProcessId) {
        const { data: stages } = await supabase
          .from('workflow_stages')
          .select('id, is_done')
          .eq('phase_id', beforeTask.phase_id)

        if (stages) {
          const stageDoneMap = new Map<string, boolean>()
          stages.forEach((s) => stageDoneMap.set(s.id, s.is_done))

          const wasDoneBefore = stageDoneMap.get(beforeTask.workflow_stage_id) === true
          const isDoneNow = stageDoneMap.get((updates.workflow_stage_id as string | undefined) ?? beforeTask.workflow_stage_id) === true

          if (!wasDoneBefore && isDoneNow) {
            const { data: processTasks } = await supabase
              .from('tasks')
              .select('id, workflow_stage_id')
              .eq('process_id', updatedProcessId)

            if (processTasks && processTasks.length > 0) {
              const allTasksDone = processTasks.every((t) => stageDoneMap.get(t.workflow_stage_id) === true)
              if (allTasksDone) {
                const { data: proc } = await supabase
                  .from('phase_processes')
                  .select('name, phase_id')
                  .eq('id', updatedProcessId)
                  .maybeSingle()

                let phaseTitle = 'Phase'
                if (proc?.phase_id) {
                  const { data: phase } = await supabase
                    .from('sdlc_phases')
                    .select('name')
                    .eq('id', proc.phase_id)
                    .maybeSingle()
                  if (phase?.name) phaseTitle = phase.name
                }
                const processTitle = proc?.name || 'Process'

                void notifyProcessCompleted({
                  supabase,
                  organizationId: orgId,
                  actorId: user.id,
                  projectId: beforeTask.project_id,
                  phaseId: beforeTask.phase_id,
                  phaseTitle,
                  processId: updatedProcessId,
                  processTitle,
                })
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ data })
  } catch (error: unknown) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: DUPLICATE_TASK_TITLE_IN_PROCESS }, { status: 409 })
    }
    const msg =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: string }).message)
        : 'Failed to update task'
    console.error('Error updating task:', error)
    const lower = msg.toLowerCase()
    const status =
      lower.includes('wip limit') || lower.includes('kanban wip') ? 409 : lower.includes('violates') ? 400 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function DELETE(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('id')

  if (!taskId) {
    return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveOrgId(supabase)
    if (!orgId) return NextResponse.json({ error: 'Missing tenant context' }, { status: 400 })

    const { data: beforeTask } = await supabase
      .from('tasks')
      .select('title, project_id')
      .eq('id', taskId)
      .eq('organization_id', orgId)
      .maybeSingle()

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('organization_id', orgId)

    if (error) throw error

    if (beforeTask) {
      void notifyTaskDeleted({
        supabase,
        organizationId: orgId,
        actorId: user.id,
        taskTitle: beforeTask.title,
        projectId: beforeTask.project_id,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}

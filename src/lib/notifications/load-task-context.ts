import type { SupabaseClient } from '@supabase/supabase-js'

export type TaskNotificationContext = {
  id: string
  title: string
  project_id: string
  assignee_id: string | null
  process_id: string | null
  phase_id: string | null
}

export async function loadTaskNotificationContext(
  supabase: SupabaseClient,
  organizationId: string,
  taskId: string
): Promise<TaskNotificationContext | null> {
  const { data: task, error } = await supabase
    .from('tasks')
    .select('id, title, project_id, assignee_id, process_id, workflow_stage_id')
    .eq('id', taskId)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (error || !task?.id) return null

  let phaseId: string | null = null
  if (task.workflow_stage_id) {
    const { data: stage } = await supabase
      .from('workflow_stages')
      .select('phase_id')
      .eq('id', task.workflow_stage_id as string)
      .eq('organization_id', organizationId)
      .maybeSingle()
    phaseId = (stage?.phase_id as string) ?? null
  }

  return {
    id: task.id as string,
    title: (task.title as string) ?? 'Task',
    project_id: task.project_id as string,
    assignee_id: (task.assignee_id as string | null) ?? null,
    process_id: (task.process_id as string | null) ?? null,
    phase_id: phaseId,
  }
}

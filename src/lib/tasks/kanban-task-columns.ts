/** Column lists for Kanban/board task queries with graceful fallback when migrations are pending. */

export const KANBAN_TASK_COLUMNS_FULL =
  'id,title,description,priority,story_points,workflow_stage_id,completed_at,position,current_stage_entered_at,size_band,service_class,team_id,assignee_id,blocked,blocked_reason,task_type'

export const KANBAN_TASK_COLUMNS_NO_TYPE =
  'id,title,description,priority,story_points,workflow_stage_id,completed_at,position,current_stage_entered_at,size_band,service_class,team_id,assignee_id,blocked,blocked_reason'

export const KANBAN_TASK_COLUMNS_BASE =
  'id,title,description,priority,story_points,workflow_stage_id,completed_at,position,team_id,assignee_id,blocked,blocked_reason'

export const BACKLOG_TASK_COLUMNS_FULL =
  'id,title,description,priority,story_points,assignee_id,position,team_id,workflow_stage_id,size_band,service_class,blocked,blocked_reason,task_type'

export const BACKLOG_TASK_COLUMNS_NO_TYPE =
  'id,title,description,priority,story_points,assignee_id,position,team_id,workflow_stage_id,size_band,service_class,blocked,blocked_reason'

export const BACKLOG_TASK_COLUMNS_BASE =
  'id,title,description,priority,story_points,assignee_id,position,team_id,workflow_stage_id,blocked,blocked_reason'

export function isMissingTaskColumnError(message: string, code?: string) {
  const m = message.toLowerCase()
  return (
    code === '42703' ||
    m.includes('task_type') ||
    m.includes('blocked_reason') ||
    m.includes('blocked') ||
    m.includes('size_band') ||
    m.includes('service_class') ||
    m.includes('current_stage_entered_at')
  )
}

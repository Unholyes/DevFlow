export type NotificationType =
  | 'task_assigned'
  | 'task_comment'
  | 'phase_completed'
  | 'project_completed'
  | 'process_completed'
  | 'task_created'
  | 'task_deleted'
  | 'task_edited'
  | 'team_added'
  | 'role_adjusted'
  | 'assigned_project'
  | 'assigned_phase'
  | 'assigned_process'

export type UserNotificationRow = {
  id: string
  organization_id: string
  recipient_id: string
  actor_id: string | null
  type: NotificationType
  title: string
  body: string | null
  href: string | null
  project_id: string | null
  task_id: string | null
  read_at: string | null
  created_at: string
}

export type NotificationDto = {
  id: string
  type: NotificationType
  title: string
  body: string | null
  href: string | null
  read: boolean
  createdAt: string
  actorName: string | null
}

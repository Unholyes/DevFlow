import type { SupabaseClient } from '@supabase/supabase-js'
import { SDLC_BACKLOG_MANAGE, SDLC_TASKS_ARCHIVE } from '@/lib/permissions/project-template-permissions'
import { userHasProjectTemplatePermission } from '@/lib/permissions/resolve-project-template-permission'

export async function userCanManageBacklog(
  supabase: SupabaseClient,
  params: { organizationId: string; userId: string; projectId: string },
) {
  return userHasProjectTemplatePermission(supabase, {
    ...params,
    permissionId: SDLC_BACKLOG_MANAGE,
  })
}

export async function userCanArchiveTasks(
  supabase: SupabaseClient,
  params: { organizationId: string; userId: string; projectId: string },
) {
  return userHasProjectTemplatePermission(supabase, {
    ...params,
    permissionId: SDLC_TASKS_ARCHIVE,
  })
}

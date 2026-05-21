import type { SupabaseClient } from '@supabase/supabase-js'
import { SDLC_BACKLOG_MANAGE } from '@/lib/permissions/project-template-permissions'
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

import type { SupabaseClient } from '@supabase/supabase-js'
import { PM_PROJECT_MEMBERS_MANAGE } from '@/lib/permissions/project-template-permissions'
import { userHasProjectTemplatePermission } from '@/lib/permissions/resolve-project-template-permission'

export async function userCanManageProjectMembers(
  supabase: SupabaseClient,
  params: { organizationId: string; userId: string; projectId: string },
) {
  return userHasProjectTemplatePermission(supabase, {
    ...params,
    permissionId: PM_PROJECT_MEMBERS_MANAGE,
  })
}

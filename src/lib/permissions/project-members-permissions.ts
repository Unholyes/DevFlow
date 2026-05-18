import type { SupabaseClient } from '@supabase/supabase-js'
import { userHasGlobalAccountPermission } from '@/lib/permissions/global-account-permissions'
import { PM_PROJECT_MEMBERS_MANAGE } from '@/lib/permissions/project-template-permissions'
import { userHasProjectTemplatePermission } from '@/lib/permissions/resolve-project-template-permission'

/**
 * Hybrid: workspace account role (Owner / Admin defaults / custom roles) OR
 * project access template on this project (e.g. project Admin).
 */
export async function userCanManageProjectMembers(
  supabase: SupabaseClient,
  params: { organizationId: string; userId: string; projectId: string },
) {
  const [viaAccount, viaProjectTemplate] = await Promise.all([
    userHasGlobalAccountPermission(supabase, {
      organizationId: params.organizationId,
      userId: params.userId,
      permissionId: PM_PROJECT_MEMBERS_MANAGE,
    }),
    userHasProjectTemplatePermission(supabase, {
      ...params,
      permissionId: PM_PROJECT_MEMBERS_MANAGE,
    }),
  ])

  return viaAccount || viaProjectTemplate
}

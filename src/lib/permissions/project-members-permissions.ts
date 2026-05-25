import type { SupabaseClient } from '@supabase/supabase-js'
import { userHasGlobalAccountPermission } from '@/lib/permissions/global-account-permissions'
import { PM_PROJECT_MEMBERS_MANAGE } from '@/lib/permissions/project-template-permissions'
import { userHasProjectTemplatePermission } from '@/lib/permissions/resolve-project-template-permission'

/**
 * Whether the user may open "Manage Team" for a specific project.
 *
 * - **Project assignment** (`organization_project_access_templates` for the member's
 *   `project_access_level` on this project, plus project team role permissions on this row).
 * - **Account-wide** (`organization_default_roles` / custom account roles): grants manage on
 *   every project when `pm.project_members.manage` is enabled there (workspace Admin / custom roles).
 * - **Owner** always has account-wide manage via `userHasGlobalAccountPermission`.
 *
 * Project-scoped checks do not infer Admin from other projects or org-level shortcuts when the
 * user is not on `project_members` for this project.
 */
export async function userCanManageProjectMembers(
  supabase: SupabaseClient,
  params: { organizationId: string; userId: string; projectId: string },
) {
  const [hasGlobalAccount, hasOnThisProject] = await Promise.all([
    userHasGlobalAccountPermission(supabase, {
      organizationId: params.organizationId,
      userId: params.userId,
      permissionId: PM_PROJECT_MEMBERS_MANAGE,
    }),
    userHasProjectTemplatePermission(supabase, {
      organizationId: params.organizationId,
      userId: params.userId,
      projectId: params.projectId,
      permissionId: PM_PROJECT_MEMBERS_MANAGE,
    }),
  ])

  return hasGlobalAccount || hasOnThisProject
}

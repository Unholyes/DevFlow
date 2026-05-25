import type { SupabaseClient } from '@supabase/supabase-js'
import { userHasGlobalAccountPermission } from '@/lib/permissions/global-account-permissions'
import { PM_PROJECT_SETTINGS_MANAGE } from '@/lib/permissions/project-template-permissions'
import { userHasProjectTemplatePermission } from '@/lib/permissions/resolve-project-template-permission'

/**
 * Whether the user may open project settings (general tab: name, status, gating, delete).
 *
 * - **Project assignment**: access template for `project_access_level` on this project + team role permissions.
 * - **Account-wide**: `organization_default_roles` / custom account roles with `pm.project_settings.manage`.
 *
 * Team role definitions live under Accounts → Team roles (`userCanManageOrganizationRoles`).
 * Assigning members uses Manage project team (`userCanManageProjectMembers`).
 */
export async function userCanManageProjectSettings(
  supabase: SupabaseClient,
  params: { organizationId: string; userId: string; projectId: string },
) {
  const [hasGlobalAccount, hasOnThisProject] = await Promise.all([
    userHasGlobalAccountPermission(supabase, {
      organizationId: params.organizationId,
      userId: params.userId,
      permissionId: PM_PROJECT_SETTINGS_MANAGE,
    }),
    userHasProjectTemplatePermission(supabase, {
      organizationId: params.organizationId,
      userId: params.userId,
      projectId: params.projectId,
      permissionId: PM_PROJECT_SETTINGS_MANAGE,
    }),
  ])

  return hasGlobalAccount || hasOnThisProject
}

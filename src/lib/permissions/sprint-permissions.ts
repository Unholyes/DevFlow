import type { SupabaseClient } from '@supabase/supabase-js'
import {
  PM_SPRINTS_MANAGE,
  SDLC_SPRINTS_CREATE,
} from '@/lib/permissions/project-template-permissions'
import { userHasProjectTemplatePermission } from '@/lib/permissions/resolve-project-template-permission'

export async function userCanCreateSprintDraft(
  supabase: SupabaseClient,
  params: { organizationId: string; userId: string; projectId: string },
) {
  return userHasProjectTemplatePermission(supabase, {
    ...params,
    permissionId: SDLC_SPRINTS_CREATE,
  })
}

export async function userCanManageSprints(
  supabase: SupabaseClient,
  params: { organizationId: string; userId: string; projectId: string },
) {
  return userHasProjectTemplatePermission(supabase, {
    ...params,
    permissionId: PM_SPRINTS_MANAGE,
  })
}

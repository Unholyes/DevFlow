import type { SupabaseClient } from '@supabase/supabase-js'
import { PM_PHASE_GATES_APPROVE } from '@/lib/permissions/project-template-permissions'
import { userHasProjectTemplatePermission } from '@/lib/permissions/resolve-project-template-permission'

export async function userCanApprovePhaseGates(
  supabase: SupabaseClient,
  params: { organizationId: string; userId: string; projectId: string },
) {
  return userHasProjectTemplatePermission(supabase, {
    ...params,
    permissionId: PM_PHASE_GATES_APPROVE,
  })
}

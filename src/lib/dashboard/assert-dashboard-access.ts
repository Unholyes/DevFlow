import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserRole } from '@/types'
import {
  canAccessDashboardPath,
  defaultDashboardHomeForRole,
  extractProjectIdFromPath,
} from '@/lib/dashboard/dashboard-access'

export async function assertDashboardAccess(opts: {
  supabase: SupabaseClient
  userId: string
  role: UserRole
  pathname: string
}): Promise<{ allowed: true } | { allowed: false; redirectTo: string }> {
  const { supabase, userId, role, pathname } = opts
  const redirectTo = defaultDashboardHomeForRole(role)

  if (!canAccessDashboardPath(role, pathname)) {
    return { allowed: false, redirectTo }
  }

  if (role === 'team_member') {
    const projectId = extractProjectIdFromPath(pathname)
    if (projectId) {
      const { data: membership } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .maybeSingle()

      if (!membership?.id) {
        return { allowed: false, redirectTo }
      }
    }
  }

  return { allowed: true }
}

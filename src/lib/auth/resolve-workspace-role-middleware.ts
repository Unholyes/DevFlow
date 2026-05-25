import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserRole } from '@/types'

/**
 * Edge-safe org-scoped role resolution for middleware (no `headers()` dependency).
 */
export async function resolveWorkspaceRoleForMiddleware(
  supabase: SupabaseClient,
  userId: string,
  tenantSlug: string | null
): Promise<{ organizationId: string | null; role: UserRole }> {
  let organizationId: string | null = null

  if (tenantSlug) {
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', tenantSlug)
      .maybeSingle()
    organizationId = org?.id ?? null
  }

  if (!organizationId) {
    const { data: owned } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', userId)
      .limit(1)
      .maybeSingle()
    organizationId = owned?.id ?? null
  }

  if (!organizationId) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()
    organizationId = membership?.organization_id ?? null
  }

  if (!organizationId) {
    return { organizationId: null, role: 'team_member' }
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('system_role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle()

  const systemRole = String((membership as { system_role?: string } | null)?.system_role ?? 'Member')
  const role: UserRole = systemRole === 'Owner' || systemRole === 'Admin' ? 'tenant_admin' : 'team_member'

  return { organizationId, role }
}

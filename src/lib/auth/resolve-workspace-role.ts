import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import type { UserRole } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'

export type WorkspaceContext = {
  organizationId: string | null
  organizationSlug: string | null
  role: UserRole
  isOwner: boolean
}

/**
 * Resolve the active organization and org-scoped role for the current request.
 *
 * - `super_admin` remains a global role (from profiles).
 * - Otherwise, derive access level from `organization_members.system_role`.
 */
export async function resolveWorkspaceContext(opts: {
  supabase: SupabaseClient
  userId: string
  fallbackOrgSlug?: string | null
}): Promise<WorkspaceContext> {
  const tenantSlug = getTenantSlug()
  const orgSlug = tenantSlug ?? opts.fallbackOrgSlug ?? null

  let organizationId: string | null = null

  if (orgSlug) {
    const { data: org } = await opts.supabase
      .from('organizations')
      .select('id')
      .eq('slug', orgSlug)
      .maybeSingle()
    organizationId = org?.id ?? null
  }

  if (!organizationId) {
    organizationId = await resolvePrimaryOrgIdForUser(opts.supabase as any, opts.userId)
  }

  if (!organizationId) {
    return { organizationId: null, organizationSlug: orgSlug, role: 'team_member', isOwner: false }
  }

  const { data: orgRow } = await opts.supabase
    .from('organizations')
    .select('id,slug')
    .eq('id', organizationId)
    .maybeSingle()

  const { data: membership } = await opts.supabase
    .from('organization_members')
    .select('system_role')
    .eq('organization_id', organizationId)
    .eq('user_id', opts.userId)
    .maybeSingle()

  const systemRole = String((membership as any)?.system_role ?? 'Member')
  const isOwner = systemRole === 'Owner'
  const isAdmin = systemRole === 'Admin'
  const role: UserRole = isOwner || isAdmin ? 'tenant_admin' : 'team_member'

  return {
    organizationId,
    organizationSlug: orgRow?.slug ?? orgSlug,
    role,
    isOwner,
  }
}


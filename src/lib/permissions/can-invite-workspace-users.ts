import type { SupabaseClient } from '@supabase/supabase-js'
import {
  canonicalBuiltinRoleKey,
  customRolesIncludeManageMembers,
  type OrganizationRoleRow,
} from '@/lib/permissions/can-manage-organization-roles'

function permissionListHasInviteUsers(perms: unknown): boolean {
  if (!Array.isArray(perms)) return false
  return perms.some(
    (p) =>
      typeof p === 'string' &&
      ['account.users.invite', 'account.members.manage'].includes(p.toLowerCase()),
  )
}

/**
 * Matches Accounts → Roles invite rules:
 * - Owner: always
 * - Admin: organization_default_roles Admin must include invite (or legacy manage)
 * - Member: assigned custom roles with invite / manage members
 */
export async function userCanInviteWorkspaceUsers(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
): Promise<boolean> {
  const [{ data: membership }, { data: defaultRoleRows }, { data: customRoleRows }] = await Promise.all([
    supabase
      .from('organization_members')
      .select('system_role,custom_roles')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('organization_default_roles')
      .select('role,permissions')
      .eq('organization_id', organizationId),
    supabase.from('organization_roles').select('id,name,permissions').eq('organization_id', organizationId),
  ])

  const systemRole = String((membership as { system_role?: unknown } | null)?.system_role ?? 'Member')
  if (systemRole === 'Owner') return true

  if (systemRole === 'Admin') {
    const adminRow = (defaultRoleRows ?? []).find(
      (row) => canonicalBuiltinRoleKey(String((row as { role?: unknown }).role ?? '')) === 'Admin',
    )
    return permissionListHasInviteUsers((adminRow as { permissions?: unknown } | undefined)?.permissions)
  }

  const assignedCustomRoles: string[] = Array.isArray(
    (membership as { custom_roles?: unknown } | null)?.custom_roles,
  )
    ? ((membership as { custom_roles: unknown[] }).custom_roles.filter(
        (x): x is string => typeof x === 'string' && x.trim().length > 0,
      ) as string[])
    : []

  return customRolesIncludeManageMembers(
    assignedCustomRoles,
    (customRoleRows ?? []) as OrganizationRoleRow[],
  )
}

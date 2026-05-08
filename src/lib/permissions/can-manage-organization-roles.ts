import type { SupabaseClient } from '@supabase/supabase-js'

export type OrganizationRoleRow = {
  id: string
  name: string
  permissions: unknown
}

export type BuiltinRoleKey = 'Owner' | 'Admin' | 'Member'

function normalizeRoleName(input: string) {
  return input.trim().replace(/\s+/g, ' ')
}

function asPermissionStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((x): x is string => typeof x === 'string')
}

function permissionsIncludeAccountMembersManage(permissions: unknown): boolean {
  return asPermissionStrings(permissions).some((p) => p.toLowerCase() === 'account.members.manage')
}

/**
 * Map a value from `organization_members.roles[]` or `organization_default_roles.role`
 * to the canonical key (Owner, Admin, Member). Case-insensitive.
 */
export function canonicalBuiltinRoleKey(name: string): BuiltinRoleKey | null {
  const n = normalizeRoleName(name).toLowerCase()
  if (n === 'owner') return 'Owner'
  if (n === 'admin') return 'Admin'
  if (n === 'member') return 'Member'
  return null
}

/**
 * For members (system_role=Member), custom role names are stored on `organization_members.custom_roles[]`.
 * If any assigned custom role includes `account.members.manage`, the user may manage members/roles.
 */
export function customRolesIncludeManageMembers(
  assignedCustomRoles: string[],
  customOrgRoles: OrganizationRoleRow[],
): boolean {
  if (!Array.isArray(assignedCustomRoles) || assignedCustomRoles.length === 0) return false

  const customByNameLower = new Map<string, OrganizationRoleRow>()
  for (const r of customOrgRoles) {
    customByNameLower.set(normalizeRoleName(r.name).toLowerCase(), r)
  }

  for (const rawName of assignedCustomRoles) {
    if (typeof rawName !== 'string') continue
    const key = normalizeRoleName(rawName).toLowerCase()
    const custom = customByNameLower.get(key)
    if (custom && permissionsIncludeAccountMembersManage(custom.permissions)) return true
  }

  return false
}

/**
 * Supabase-backed rule order:
 * 1. **Global admin** (`profiles.role` = `super_admin`) — not scoped to membership.
 * 2. Must be an **organization member** (`organization_members` row).
 * 3. If `system_role` ∈ {Owner, Admin} → allowed.
 * 4. Otherwise, allow if any assigned `custom_roles[]` role includes `account.members.manage`.
 */
export async function userCanManageOrganizationRoles(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const [{ data: profileRow }, { data: memberRow }, { data: customRows }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', userId).maybeSingle(),
    supabase
      .from('organization_members')
      .select('user_id,system_role,custom_roles')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.from('organization_roles').select('id,name,permissions').eq('organization_id', organizationId),
  ])

  const appRole = profileRow?.role as string | undefined
  if (appRole === 'super_admin') return true

  if (!memberRow) return false

  const systemRole = String((memberRow as any)?.system_role ?? 'Member')
  if (systemRole === 'Owner' || systemRole === 'Admin') return true

  const assigned = Array.isArray((memberRow as any)?.custom_roles)
    ? (((memberRow as any).custom_roles as unknown[]).filter((r) => typeof r === 'string') as string[])
    : []

  return customRolesIncludeManageMembers(assigned, (customRows ?? []) as OrganizationRoleRow[])
}

import type { SupabaseClient } from '@supabase/supabase-js'

export type OrganizationRoleRow = {
  id: string
  name: string
  permissions: unknown
}

type BuiltinRoleKey = 'Admin' | 'Project Manager' | 'Member'

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
 * to the canonical key (Admin, Project Manager, Member). Case-insensitive.
 */
export function canonicalBuiltinRoleKey(name: string): BuiltinRoleKey | null {
  const n = normalizeRoleName(name).toLowerCase()
  if (n === 'admin') return 'Admin'
  if (n === 'project manager') return 'Project Manager'
  if (n === 'member') return 'Member'
  return null
}

/** Matches DB semantics: user is a workspace admin if any element of `roles[]` is Admin (any casing). */
function isAssignedWorkspaceAdminFromRolesArray(assignedStrings: string[]): boolean {
  const effective = assignedStrings.length > 0 ? assignedStrings : ['Member']
  return effective.some((r) => canonicalBuiltinRoleKey(r) === 'Admin')
}

/**
 * Org membership required. Does not include owner / profile checks — use `userCanManageOrganizationRoles`.
 *
 * 1. If `roles[]` contains the workspace **Admin** builtin (any casing), including alongside Member → allowed.
 * 2. Otherwise, for each entry in `roles[]`, resolve permissions from `organization_default_roles` /
 *    `organization_roles` and allow if any includes `account.members.manage`.
 */
export function computeCanManageOrgRoles(
  currentUserId: string,
  memberRows: any[] | null | undefined,
  customOrgRoles: OrganizationRoleRow[],
  defaultRoleRows: Array<{ role: string; permissions: unknown }> | null | undefined,
): boolean {
  const row = (memberRows ?? []).find((m: any) => m.user_id === currentUserId)
  if (!row) return false

  const assignedStrings: string[] = Array.isArray(row.roles)
    ? (row.roles.filter((x: any) => typeof x === 'string') as string[])
    : []

  if (isAssignedWorkspaceAdminFromRolesArray(assignedStrings)) return true

  const normalizedAssigned = (assignedStrings.length > 0 ? assignedStrings : ['Member']).map((r) =>
    normalizeRoleName(r),
  )

  const defaultByRole = new Map<string, unknown>()
  for (const d of defaultRoleRows ?? []) {
    if (d?.role != null) {
      const key = normalizeRoleName(String(d.role))
      defaultByRole.set(key, d.permissions)
      const canon = canonicalBuiltinRoleKey(key)
      if (canon) defaultByRole.set(canon, d.permissions)
    }
  }

  const customByNameLower = new Map<string, OrganizationRoleRow>()
  for (const r of customOrgRoles) {
    customByNameLower.set(normalizeRoleName(r.name).toLowerCase(), r)
  }

  for (const name of normalizedAssigned) {
    const builtinKey = canonicalBuiltinRoleKey(name)
    if (builtinKey) {
      const perms = defaultByRole.get(builtinKey) ?? defaultByRole.get(name)
      if (permissionsIncludeAccountMembersManage(perms)) return true
      continue
    }

    const custom = customByNameLower.get(name.toLowerCase())
    if (custom && permissionsIncludeAccountMembersManage(custom.permissions)) return true
  }

  return false
}

/**
 * Supabase-backed rule order:
 * 1. **Organization owner** (`organizations.owner_id`).
 * 2. **Global admin** (`profiles.role` = `super_admin`) — not scoped to membership.
 * 3. Must be an **organization member** (`organization_members` row).
 * 4. **App-level tenant admin** (`profiles.role` = `tenant_admin`).
 * 5. **Workspace Admin** in `organization_members.roles[]` or **Manage members** derived from `roles[]`
 *    via `organization_default_roles` / `organization_roles` (`computeCanManageOrgRoles`).
 */
export async function userCanManageOrganizationRoles(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const [{ data: orgRow }, { data: profileRow }, { data: memberRow }, { data: defaultRows }, { data: customRows }] =
    await Promise.all([
      supabase.from('organizations').select('owner_id').eq('id', organizationId).maybeSingle(),
      supabase.from('profiles').select('role').eq('id', userId).maybeSingle(),
      supabase
        .from('organization_members')
        .select('user_id,roles')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .maybeSingle(),
      supabase.from('organization_default_roles').select('role,permissions').eq('organization_id', organizationId),
      supabase.from('organization_roles').select('id,name,permissions').eq('organization_id', organizationId),
    ])

  if (orgRow?.owner_id === userId) return true

  const appRole = profileRow?.role as string | undefined
  if (appRole === 'super_admin') return true

  if (!memberRow) return false

  if (appRole === 'tenant_admin') return true

  return computeCanManageOrgRoles(
    userId,
    [memberRow],
    (customRows ?? []) as OrganizationRoleRow[],
    defaultRows ?? [],
  )
}

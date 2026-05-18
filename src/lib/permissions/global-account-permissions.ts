/**
 * Account-wide ("global") permissions stored on `organization_default_roles` and
 * `organization_roles`. System roles (Owner / Admin / Member) and custom account
 * roles may grant these.
 *
 * Delivery actions (sprints, gates, backlog, etc.) use project access templates.
 * Some `pm.*` ids also exist on templates for per-project delegation; account
 * copies apply workspace-wide (e.g. manage any project team).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { canonicalBuiltinRoleKey } from '@/lib/permissions/can-manage-organization-roles'

export const GLOBAL_ACCOUNT_PERMISSION_IDS = [
  'account.users.invite',
  'account.users.remove',
  'pm.projects.create',
  'pm.project_members.manage',
  'projects.archive',
  'system.api_tokens.generate',
  'system.integrations.manage',
] as const

export type GlobalAccountPermissionId = (typeof GLOBAL_ACCOUNT_PERMISSION_IDS)[number]

const GLOBAL_SET = new Set(GLOBAL_ACCOUNT_PERMISSION_IDS.map((p) => p.toLowerCase()))

export function isGlobalAccountPermissionId(id: string): boolean {
  return GLOBAL_SET.has(id.trim().toLowerCase())
}

/** Strips non-global permission ids (e.g. legacy rows) when saving or displaying role templates. */
export function filterToGlobalAccountPermissions(permissions: unknown): string[] {
  if (!Array.isArray(permissions)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of permissions) {
    if (typeof raw !== 'string') continue
    const id = raw.trim()
    if (!isGlobalAccountPermissionId(id)) continue
    const k = id.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(id)
  }
  return out
}

function normalizeName(input: string) {
  return input.trim().replace(/\s+/g, ' ')
}

function permissionListHas(perms: unknown, id: string) {
  if (!Array.isArray(perms)) return false
  const target = id.toLowerCase()
  return perms.some((p) => typeof p === 'string' && p.toLowerCase() === target)
}

/** Workspace Owner / default role / custom account role permission check. */
export async function userHasGlobalAccountPermission(
  supabase: SupabaseClient,
  params: { organizationId: string; userId: string; permissionId: GlobalAccountPermissionId },
): Promise<boolean> {
  const { data: membership } = await supabase
    .from('organization_members')
    .select('system_role,custom_roles')
    .eq('organization_id', params.organizationId)
    .eq('user_id', params.userId)
    .maybeSingle()

  const systemRole = String((membership as { system_role?: unknown })?.system_role ?? 'Member')
  if (systemRole === 'Owner') return true

  const assignedCustomRoles: string[] = Array.isArray((membership as { custom_roles?: unknown })?.custom_roles)
    ? ((membership as { custom_roles: unknown[] }).custom_roles.filter(
        (x): x is string => typeof x === 'string' && x.trim().length > 0,
      ) as string[])
    : []

  const roleKey = canonicalBuiltinRoleKey(systemRole)
  const [{ data: defaultRoleRow }, { data: customRoleRows }] = await Promise.all([
    roleKey
      ? supabase
          .from('organization_default_roles')
          .select('permissions')
          .eq('organization_id', params.organizationId)
          .eq('role', roleKey)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('organization_roles').select('name,permissions').eq('organization_id', params.organizationId),
  ])

  const customByNameLower = new Map<string, unknown>()
  for (const r of customRoleRows ?? []) {
    const nameLower = normalizeName(String((r as { name?: unknown })?.name ?? '')).toLowerCase()
    if (!nameLower) continue
    customByNameLower.set(nameLower, (r as { permissions?: unknown }).permissions)
  }

  const target = params.permissionId
  if (permissionListHas((defaultRoleRow as { permissions?: unknown })?.permissions, target)) {
    return true
  }

  return assignedCustomRoles.some((name) =>
    permissionListHas(customByNameLower.get(normalizeName(name).toLowerCase()), target),
  )
}

/**
 * Account-wide ("global") permissions stored on `organization_default_roles` and
 * `organization_roles`. System roles (Owner / Admin / Member) and custom account
 * roles may only grant these — never project-scoped capabilities.
 *
 * Project-scoped actions are enforced via `project_members.project_access_level`
 * (see `project-access-level.ts`).
 */

export const GLOBAL_ACCOUNT_PERMISSION_IDS = [
  'account.users.invite',
  'account.users.remove',
  'pm.projects.create',
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

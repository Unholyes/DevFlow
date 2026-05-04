import { createClient } from '@/lib/supabase/server'
import { resolveTenantSlugFromHost, TENANT_SLUG_HEADER } from '@/lib/tenant/resolve'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'

export function getTenantSlugFromRequest(request: Request): string | null {
  const injected = request.headers.get(TENANT_SLUG_HEADER)
  if (injected) return injected
  const host = request.headers.get('host')
  return resolveTenantSlugFromHost({ host })
}

export async function resolveWorkspaceOrgId(supabase: ReturnType<typeof createClient>, request: Request): Promise<string | null> {
  const tenantSlug = getTenantSlugFromRequest(request)
  if (tenantSlug) {
    const { data: org } = await supabase.from('organizations').select('id').eq('slug', tenantSlug).maybeSingle()
    if (org?.id) return org.id as string
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  return resolvePrimaryOrgIdForUser(supabase as any, user.id)
}

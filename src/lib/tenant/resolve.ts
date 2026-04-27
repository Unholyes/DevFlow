export const TENANT_SLUG_HEADER = 'x-tenant-slug'

function stripPort(host: string) {
  const idx = host.indexOf(':')
  return idx === -1 ? host : host.slice(0, idx)
}

/**
 * Resolve tenant slug from the request host.
 *
 * Supported patterns (MVP):
 * - Production: {orgSlug}.{baseDomain}  -> orgSlug
 * - Local dev:  {orgSlug}.localhost     -> orgSlug
 *
 * Returns null for the base domain itself (marketing/auth/onboarding),
 * and for IP/localhost without a subdomain.
 */
export function resolveTenantSlugFromHost(opts: {
  host: string | null
  baseDomain?: string
}): string | null {
  if (!opts.host) return null

  const host = stripPort(opts.host).toLowerCase()

  // Hard stop cases (no subdomain tenancy).
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return null

  const baseDomain = (opts.baseDomain ?? process.env.NEXT_PUBLIC_BASE_DOMAIN ?? '').toLowerCase()

  // If a baseDomain is configured, prefer that.
  if (baseDomain) {
    if (host === baseDomain) return null
    if (host.endsWith(`.${baseDomain}`)) {
      const slug = host.slice(0, host.length - (baseDomain.length + 1))
      return slug && slug !== 'www' ? slug : null
    }
  }

  // Local dev fallback: {slug}.localhost
  if (host.endsWith('.localhost')) {
    const slug = host.slice(0, host.length - '.localhost'.length)
    return slug && slug !== 'www' ? slug : null
  }

  return null
}


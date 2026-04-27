import { headers } from 'next/headers'
import { resolveTenantSlugFromHost, TENANT_SLUG_HEADER } from './resolve'

export function getTenantSlug() {
  const h = headers()
  const injected = h.get(TENANT_SLUG_HEADER)
  if (injected) return injected

  // Fallback: resolve directly from Host header.
  // Some Next.js internal requests may not preserve custom request headers.
  const host = h.get('host')
  return resolveTenantSlugFromHost({ host })
}


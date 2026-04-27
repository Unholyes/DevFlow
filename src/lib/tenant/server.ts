import { headers } from 'next/headers'
import { TENANT_SLUG_HEADER } from './resolve'

export function getTenantSlug() {
  return headers().get(TENANT_SLUG_HEADER)
}


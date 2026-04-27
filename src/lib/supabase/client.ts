import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function resolveCookieDomainForBrowser(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const host = window.location.hostname.toLowerCase()
  // NOTE: Browsers often reject `Domain=.localhost` cookies.
  // For local dev, keep host-only cookies (domain undefined). Users should log in on the tenant subdomain.
  const baseDomain = (process.env.NEXT_PUBLIC_BASE_DOMAIN ?? '').trim().toLowerCase()
  if (baseDomain && (host === baseDomain || host.endsWith(`.${baseDomain}`))) {
    return `.${baseDomain}`
  }

  return undefined
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookieOptions: {
    domain: resolveCookieDomainForBrowser(),
  },
})
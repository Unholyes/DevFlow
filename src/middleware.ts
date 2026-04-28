import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { USER_ROLES } from './constants'
import { resolveTenantSlugFromHost, TENANT_SLUG_HEADER } from '@/lib/tenant/resolve'

function stripPort(host: string) {
  const idx = host.indexOf(':')
  return idx === -1 ? host : host.slice(0, idx)
}

function resolveSharedCookieDomain(host: string | null) {
  const h = stripPort((host ?? '').toLowerCase())
  if (!h) return undefined
  // For local dev, do NOT set Domain=.localhost (often rejected by browsers).
  // Keep host-only cookies per subdomain. For production, share cookies across tenant subdomains.
  const baseDomain = (process.env.NEXT_PUBLIC_BASE_DOMAIN ?? '').trim().toLowerCase()
  if (baseDomain) return `.${baseDomain}`

  return undefined
}

function baseDomainRedirect(req: NextRequest, pathname: string, tenantSlug: string) {
  const protocol = req.nextUrl.protocol
  const host = req.headers.get('host') ?? ''

  const configuredBaseDomain = (process.env.NEXT_PUBLIC_BASE_DOMAIN ?? '').trim()
  const baseHost = configuredBaseDomain
    ? configuredBaseDomain
    : host.toLowerCase().startsWith(`${tenantSlug}.`)
      ? host.slice(tenantSlug.length + 1)
      : host

  return NextResponse.redirect(new URL(pathname, `${protocol}//${baseHost}`))
}

function tenantDomainRedirect(req: NextRequest, pathname: string, tenantSlug: string) {
  const protocol = req.nextUrl.protocol
  const host = req.headers.get('host') ?? ''

  const configuredBaseDomain = (process.env.NEXT_PUBLIC_BASE_DOMAIN ?? '').trim()
  const baseHost = configuredBaseDomain
    ? configuredBaseDomain
    : host.toLowerCase().startsWith(`${tenantSlug}.`)
      ? host
      : host

  // Preserve port if host has it (e.g. localhost:3000).
  const targetHost = configuredBaseDomain ? `${tenantSlug}.${configuredBaseDomain}` : `${tenantSlug}.${baseHost}`
  return NextResponse.redirect(new URL(pathname, `${protocol}//${targetHost}`))
}

export async function middleware(req: NextRequest) {
  const requestHeaders = new Headers(req.headers)
  const tenantSlug = resolveTenantSlugFromHost({ host: req.headers.get('host') })
  if (tenantSlug) requestHeaders.set(TENANT_SLUG_HEADER, tenantSlug)

  let res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      domain: resolveSharedCookieDomain(req.headers.get('host')),
    },
    cookies: {
      getAll() {
        return req.cookies.getAll().map((c) => ({ name: c.name, value: c.value }))
      },
      setAll(cookiesToSet) {
        res = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = req.nextUrl

  // Define route types
  const isAdminRoute = pathname.startsWith('/super-admin')
  const isProtectedRoute =
    pathname.startsWith('/dashboard') || pathname.startsWith('/settings')
  const isAuthRoute = pathname.startsWith('/auth')
  const isOnboardingRoute = pathname.startsWith('/onboarding')

  async function resolveUsersPrimaryTenantSlug(uid: string) {

    // Prefer orgs the user owns.
    const { data: owned } = await supabase
      .from('organizations')
      .select('id,slug')
      .eq('owner_id', uid)
      .limit(1)
      .maybeSingle()

    if (owned?.slug) return owned

    // Fall back to org membership.
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', uid)
      .limit(1)
      .maybeSingle()

    if (!membership?.organization_id) return null

    const { data: memberOrg } = await supabase
      .from('organizations')
      .select('id,slug')
      .eq('id', membership.organization_id)
      .limit(1)
      .maybeSingle()

    return memberOrg?.slug ? memberOrg : null
  }

  // Redirect unauthenticated users from protected routes
  if ((isProtectedRoute || isAdminRoute) && !user) {
    const redirectUrl = new URL('/auth/login', req.url)
    redirectUrl.searchParams.set('redirectedFrom', pathname)
    console.log('[mw] unauth protected -> /auth/login', {
      host: req.headers.get('host'),
      pathname,
      tenantSlug,
    })
    return NextResponse.redirect(redirectUrl)
  }

  // Automatic tenant-domain redirect (base domain -> tenant subdomain) after approval.
  // If user has a tenant org slug, send them to the tenant domain and into setup wizard if needed.
  if (user && !tenantSlug && (isAuthRoute || isOnboardingRoute || isProtectedRoute)) {
    const primaryOrg = await resolveUsersPrimaryTenantSlug(user.id)
    if (primaryOrg?.slug) {
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('organization_id', primaryOrg.id)
        .limit(1)
        .maybeSingle()

      const targetPath = project?.id ? '/dashboard' : '/onboarding/setup'
      console.log('[mw] base->tenant redirect', {
        host: req.headers.get('host'),
        pathname,
        targetPath,
        targetSlug: primaryOrg.slug,
      })
      return tenantDomainRedirect(req, targetPath, primaryOrg.slug)
    }
  }

  // On the base domain (no tenant subdomain), authenticated users should complete onboarding
  // before using /dashboard or /settings.
  if (user && isProtectedRoute && !tenantSlug) {
    console.log('[mw] base protected -> /onboarding', { host: req.headers.get('host'), pathname })
    return NextResponse.redirect(new URL('/onboarding', req.url))
  }

  // Role-based access control for admin routes
  if (isAdminRoute && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== USER_ROLES.SUPER_ADMIN) {
      // Redirect non-super-admin users to dashboard
      console.log('[mw] non-super-admin -> /dashboard', { host: req.headers.get('host'), pathname })
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // Tenant membership enforcement on tenant subdomains.
  // If a request is served from {orgSlug} subdomain, the user must belong to that organization.
  if (tenantSlug && user && (isProtectedRoute || isOnboardingRoute || pathname === '/')) {
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id,owner_id')
      .eq('slug', tenantSlug)
      .maybeSingle()

    // If slug doesn't exist or user cannot read it via RLS, redirect to base domain onboarding.
    if (orgError || !org) {
      console.log('[mw] tenant slug invalid/unreadable -> base /onboarding', {
        host: req.headers.get('host'),
        pathname,
        tenantSlug,
        orgError: orgError ? { message: orgError.message, code: (orgError as any).code } : null,
      })
      return baseDomainRedirect(req, '/onboarding', tenantSlug)
    }

    // Enforce membership: owners or organization_members only.
    if (org.owner_id !== user.id) {
      const { data: membership } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', org.id)
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (!membership?.id) {
        const redirectUrl = new URL('/auth/login', req.url)
        redirectUrl.searchParams.set('error', 'not_a_member')
        return baseDomainRedirect(req, redirectUrl.pathname + redirectUrl.search, tenantSlug)
      }
    }
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile) {
      // Redirect based on role
      if (profile.role === USER_ROLES.SUPER_ADMIN) {
        console.log('[mw] super_admin auth route -> /super-admin/dashboard', { host: req.headers.get('host'), pathname })
        return NextResponse.redirect(new URL('/super-admin/dashboard', req.url))
      } else {
        console.log('[mw] authed auth route -> /dashboard', { host: req.headers.get('host'), pathname, tenantSlug })
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }
  }

  // If already on a tenant subdomain, onboarding isn't the primary entry point.
  // Allow a tenant-scoped setup wizard under /onboarding/setup.
  if (user && isOnboardingRoute && tenantSlug && pathname === '/onboarding') {
    console.log('[mw] tenant /onboarding -> /dashboard', { host: req.headers.get('host'), pathname, tenantSlug })
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  // Include /api routes so tenant context (x-tenant-slug) is injected consistently.
  // Many API handlers rely on x-tenant-slug to enforce organization scoping.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
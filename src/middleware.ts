import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { USER_ROLES } from './constants'
import { resolveTenantSlugFromHost, TENANT_SLUG_HEADER } from '@/lib/tenant/resolve'

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
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        req.cookies.set(name, value)
        res = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })
        res.cookies.set(name, value, options)
      },
      remove(name: string, options: Record<string, unknown>) {
        req.cookies.set(name, '')
        res = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })
        res.cookies.set(name, '', { ...options, maxAge: 0 })
      },
    },
  })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  // Define route types
  const isAdminRoute = pathname.startsWith('/super-admin')
  const isProtectedRoute =
    pathname.startsWith('/dashboard') || pathname.startsWith('/settings')
  const isAuthRoute = pathname.startsWith('/auth')
  const isOnboardingRoute = pathname.startsWith('/onboarding')

  async function resolveUsersPrimaryTenantSlug() {
    if (!session) return null
    const uid = session.user.id

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
  if ((isProtectedRoute || isAdminRoute) && !session) {
    const redirectUrl = new URL('/auth/login', req.url)
    redirectUrl.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Automatic tenant-domain redirect (base domain -> tenant subdomain) after approval.
  // If user has a tenant org slug, send them to the tenant domain and into setup wizard if needed.
  if (session && !tenantSlug && (isAuthRoute || isOnboardingRoute || isProtectedRoute)) {
    const primaryOrg = await resolveUsersPrimaryTenantSlug()
    if (primaryOrg?.slug) {
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('organization_id', primaryOrg.id)
        .limit(1)
        .maybeSingle()

      const targetPath = project?.id ? '/dashboard' : '/onboarding/setup'
      return tenantDomainRedirect(req, targetPath, primaryOrg.slug)
    }
  }

  // On the base domain (no tenant subdomain), authenticated users should complete onboarding
  // before using /dashboard or /settings.
  if (session && isProtectedRoute && !tenantSlug) {
    return NextResponse.redirect(new URL('/onboarding', req.url))
  }

  // Role-based access control for admin routes
  if (isAdminRoute && session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!profile || profile.role !== USER_ROLES.SUPER_ADMIN) {
      // Redirect non-super-admin users to dashboard
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // Tenant membership enforcement on tenant subdomains.
  // If a request is served from {orgSlug} subdomain, the user must belong to that organization.
  if (tenantSlug && session && (isProtectedRoute || isOnboardingRoute || pathname === '/')) {
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', tenantSlug)
      .maybeSingle()

    // If slug doesn't exist or user cannot read it via RLS, redirect to base domain onboarding.
    if (orgError || !org) {
      return baseDomainRedirect(req, '/onboarding', tenantSlug)
    }
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profile) {
      // Redirect based on role
      if (profile.role === USER_ROLES.SUPER_ADMIN) {
        return NextResponse.redirect(new URL('/super-admin/dashboard', req.url))
      } else {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }
  }

  // If already on a tenant subdomain, onboarding isn't the primary entry point.
  // Allow a tenant-scoped setup wizard under /onboarding/setup.
  if (session && isOnboardingRoute && tenantSlug && pathname === '/onboarding') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
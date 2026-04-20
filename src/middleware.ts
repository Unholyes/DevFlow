import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { USER_ROLES } from './constants'

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: {
      headers: req.headers,
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
            headers: req.headers,
          },
        })
        res.cookies.set(name, value, options)
      },
      remove(name: string, options: Record<string, unknown>) {
        req.cookies.set(name, '')
        res = NextResponse.next({
          request: {
            headers: req.headers,
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

  // Redirect unauthenticated users from protected routes
  if ((isProtectedRoute || isAdminRoute) && !session) {
    const redirectUrl = new URL('/auth/login', req.url)
    redirectUrl.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(redirectUrl)
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

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
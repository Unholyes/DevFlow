import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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
  const isProtectedRoute =
    pathname.startsWith('/dashboard') || pathname.startsWith('/settings')

  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/auth/login', req.url)
    redirectUrl.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
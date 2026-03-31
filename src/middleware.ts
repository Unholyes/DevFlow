import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protect routes that require authentication
  if (req.nextUrl.pathname.startsWith('/(tenant)') && !session) {
    return NextResponse.redirect(new URL('/(auth)/login', req.url))
  }

  if (req.nextUrl.pathname.startsWith('/(admin)') && !session) {
    return NextResponse.redirect(new URL('/(auth)/login', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
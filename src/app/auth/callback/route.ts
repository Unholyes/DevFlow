import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

type EmailOtpType = 'magiclink' | 'invite' | 'recovery' | 'email' | 'email_change' | 'signup'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const token = url.searchParams.get('token') || url.searchParams.get('token_hash')
  const typeParam = url.searchParams.get('type')
  const next = url.searchParams.get('next') || '/'

  // Always redirect (even on failure) to avoid trapping users.
  const redirectTo = new URL(next, url.origin)

  // Create redirect response up front so we can attach auth cookies to it.
  const res = NextResponse.redirect(redirectTo)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll().map((c) => ({ name: c.name, value: c.value }))
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options)
        })
      },
    },
  })

  // Two possible flows:
  // - PKCE email links (signup/invite/etc) -> `code` param -> exchangeCodeForSession
  // - OTP email links (magiclink/recovery/etc) -> `token` + `type` -> verifyOtp
  if (!code && !token) {
    redirectTo.searchParams.set('error', 'missing_code')
    return res
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      redirectTo.searchParams.set('error', 'auth_callback_failed')
    }
    return res
  }

  // OTP link path
  const otpType = (typeParam || 'magiclink') as EmailOtpType
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: token!,
    type: otpType,
  } as any)

  if (verifyError) {
    redirectTo.searchParams.set('error', 'otp_verify_failed')
  }

  return res
}


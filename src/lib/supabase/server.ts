import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        try {
          cookieStore.set(name, value, options)
        } catch {
          // Ignore when called from Server Components where response cookies are unavailable.
        }
      },
      remove(name: string, options: Record<string, unknown>) {
        try {
          cookieStore.set(name, '', { ...options, maxAge: 0 })
        } catch {
          // Ignore when called from Server Components where response cookies are unavailable.
        }
      },
    },
  })
}
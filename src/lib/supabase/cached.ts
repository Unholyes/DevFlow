/**
 * Request-scoped cached helpers for server components.
 *
 * React's `cache()` deduplicates calls within a single server request so
 * middleware → layout → page no longer repeat identical Supabase queries.
 */
import { cache } from 'react'
import { createClient } from './server'
import type { SupabaseClient, User } from '@supabase/supabase-js'

// ──────────────────────────────────────────────
// Auth – getUser is called up to 4× per request
// ──────────────────────────────────────────────
export const getCachedUser = cache(
  async (): Promise<{ user: User | null; error: unknown }> => {
    const supabase = createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    return { user, error }
  },
)

// ──────────────────────────────────────────────
// Profile (role, full_name, avatar_url, email)
// ──────────────────────────────────────────────
export type CachedProfile = {
  role: string
  full_name: string | null
  avatar_url: string | null
  email: string | null
}

export const getCachedProfile = cache(
  async (userId: string): Promise<CachedProfile | null> => {
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('role, full_name, avatar_url, email')
      .eq('id', userId)
      .single()
    return data as CachedProfile | null
  },
)

// ──────────────────────────────────────────────
// Organization name + icon (for header/sidebar)
// ──────────────────────────────────────────────
export type CachedOrgInfo = {
  id: string
  name: string | null
  icon_url: string | null
}

export const getCachedOrgInfo = cache(
  async (orgId: string): Promise<CachedOrgInfo | null> => {
    const supabase = createClient()
    const { data } = await supabase
      .from('organizations')
      .select('id, name, icon_url')
      .eq('id', orgId)
      .single()
    return data as CachedOrgInfo | null
  },
)

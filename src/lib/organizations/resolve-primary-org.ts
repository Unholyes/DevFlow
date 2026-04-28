import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Resolve a "primary" organization for the current user.
 *
 * Used when we are not on a tenant subdomain (e.g. deployed to a single host like *.vercel.app).
 * Prefer an org the user owns, otherwise fall back to the newest membership.
 */
export async function resolvePrimaryOrgIdForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: owned } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (owned?.id) return owned.id

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return membership?.organization_id ?? null
}


import { createClient } from '@/lib/supabase/server'
import { TeamPageContent } from '@/components/dashboard/team-page-content'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import { redirect } from 'next/navigation'

export default async function DashboardTeamPage() {
  const supabase = createClient()
  const tenantSlug = getTenantSlug()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const orgId = tenantSlug
    ? (
        await supabase
          .from('organizations')
          .select('id')
          .eq('slug', tenantSlug)
          .maybeSingle()
      ).data?.id ?? null
    : await resolvePrimaryOrgIdForUser(supabase as any, user.id)

  if (!orgId) redirect('/onboarding')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role === 'tenant_admin' ? 'tenant_admin' : 'team_member'

  const [{ data: ownedOrgs }, { data: memberships }] = await Promise.all([
    supabase
      .from('organizations')
      .select('id,slug,name,created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('organization_members')
      .select('organization_id,organizations:organization_id ( id,slug,name,created_at )')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false }),
  ])

  const orgById = new Map<string, { id: string; slug: string; name: string; created_at: string }>()
  for (const o of (ownedOrgs ?? []) as Array<{ id: string; slug: string; name: string; created_at: string }>) {
    if (o?.id) orgById.set(o.id, o)
  }
  for (const raw of memberships ?? []) {
    const o = (raw as { organizations?: unknown }).organizations
    if (o && typeof o === 'object' && !Array.isArray(o) && 'id' in o) {
      const org = o as { id: string; slug: string; name: string; created_at: string }
      orgById.set(org.id, org)
    }
  }
  const accessibleOrgs = Array.from(orgById.values()).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))

  const organizations = tenantSlug ? accessibleOrgs.filter((o) => o.id === orgId) : accessibleOrgs

  return (
    <TeamPageContent
      organizationId={orgId}
      currentUserId={user.id}
      organizations={organizations}
      role={role}
    />
  )
}

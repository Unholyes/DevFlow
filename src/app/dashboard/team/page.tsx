import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TeamPageContent } from '@/components/dashboard/team-page-content'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'

export const metadata: Metadata = {
  title: 'Team | DevFlow',
  description:
    'View workspace members, project assignments, and pending invitations for your DevFlow organization.',
}

export default async function TeamPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const tenantSlug = getTenantSlug()

  const orgId = tenantSlug
    ? (
        await supabase.from('organizations').select('id').eq('slug', tenantSlug).maybeSingle()
      ).data?.id ?? null
    : await resolvePrimaryOrgIdForUser(supabase as any, user.id)

  if (!orgId) {
    redirect('/onboarding')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const workspaceRole = profile?.role === 'tenant_admin' ? 'tenant_admin' : 'team_member'

  return <TeamPageContent organizationId={orgId} role={workspaceRole} />
}

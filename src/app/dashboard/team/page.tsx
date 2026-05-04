import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolvePrimaryOrgIdForUser } from '@/lib/organizations/resolve-primary-org'
import { TeamPageContent } from '@/components/dashboard/team-page-content'

export const metadata: Metadata = {
  title: 'Team | DevFlow',
  description:
    'View workspace members, project assignments, and pending invitations for your DevFlow organization.',
}

export default async function TeamPage({ searchParams }: { searchParams?: { org?: string } }) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const tenantSlug = getTenantSlug()

  let orgId: string | null = null

  if (tenantSlug) {
    const { data: org } = await supabase.from('organizations').select('id').eq('slug', tenantSlug).maybeSingle()
    orgId = org?.id ?? null
  } else if (searchParams?.org) {
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', searchParams.org)
      .maybeSingle()
    orgId = org?.id ?? null
  }

  if (!orgId) {
    orgId = await resolvePrimaryOrgIdForUser(supabase as any, user.id)
  }

  if (!orgId) {
    redirect('/onboarding')
  }

  return <TeamPageContent organizationId={orgId} />
}

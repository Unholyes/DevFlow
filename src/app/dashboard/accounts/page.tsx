import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AccountsPageClient } from './accounts-page-client'
import { getTenantSlug } from '@/lib/tenant/server'
import { resolveWorkspaceContext } from '@/lib/auth/resolve-workspace-role'

export const metadata: Metadata = {
  title: 'Accounts | DevFlow',
  description: 'Tenant admin workspace account and invitation management.',
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams?: { org?: string }
}) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'super_admin') redirect('/super-admin/dashboard')

  const tenantSlug = getTenantSlug()
  let organizationId: string | null = null

  if (tenantSlug) {
    const { data: org } = await supabase.from('organizations').select('id').eq('slug', tenantSlug).maybeSingle()
    organizationId = org?.id ?? null
  }

  // On base-domain / single-host deployments (no tenantSlug), allow selecting a workspace explicitly.
  // Example: /dashboard/accounts?org=helloworld
  if (!tenantSlug && !organizationId && searchParams?.org) {
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', searchParams.org)
      .maybeSingle()
    organizationId = org?.id ?? null
  }

  if (!organizationId) {
    const { data: owned } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    organizationId = owned?.id ?? null
  }

  if (!organizationId) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    organizationId = membership?.organization_id ?? null
  }

  if (!organizationId) {
    redirect('/dashboard')
  }

  // Org-scoped authorization: only allow admins/owners to access Accounts for this org.
  const ws = await resolveWorkspaceContext({
    supabase: supabase as any,
    userId: user.id,
    fallbackOrgSlug: tenantSlug ? null : searchParams?.org ?? null,
  })
  if (ws.role !== 'tenant_admin' || ws.organizationId !== organizationId) {
    redirect('/dashboard')
  }

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
  for (const o of (ownedOrgs ?? []) as any[]) {
    if (o?.id) orgById.set(o.id, o)
  }
  for (const m of (memberships ?? []) as any[]) {
    const o = m?.organizations
    if (o?.id) orgById.set(o.id, o)
  }
  const accessibleOrgs = Array.from(orgById.values()).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))

  const organizations = tenantSlug ? accessibleOrgs.filter((o) => o.id === organizationId) : accessibleOrgs

  return (
    <AccountsPageClient
      organizationId={organizationId}
      currentUserId={user.id}
      organizations={organizations as any}
    />
  )
}


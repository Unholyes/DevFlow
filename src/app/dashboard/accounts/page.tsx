import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AccountsPageContent } from '@/components/accounts/accounts-page-content'
import { getTenantSlug } from '@/lib/tenant/server'

export const metadata: Metadata = {
  title: 'Accounts | DevFlow',
  description: 'Tenant admin workspace account and invitation management.',
}

export default async function AccountsPage() {
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

  if (profile?.role !== 'tenant_admin') {
    redirect('/dashboard')
  }

  const tenantSlug = getTenantSlug()
  let organizationId: string | null = null

  if (tenantSlug) {
    const { data: org } = await supabase.from('organizations').select('id').eq('slug', tenantSlug).maybeSingle()
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

  return <AccountsPageContent organizationId={organizationId} />
}


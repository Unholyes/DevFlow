import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTenantSlug } from '@/lib/tenant/server'
import { PermissionsPageContent } from '@/components/settings/permissions-page-content'

export default async function PermissionsSettingsPage() {
  const supabase = createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'tenant_admin') {
    redirect('/settings')
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
    redirect('/settings')
  }

  return <PermissionsPageContent organizationId={organizationId} />
}


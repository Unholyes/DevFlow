import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AccountsPageContent } from '@/components/accounts/accounts-page-content'

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

  return <AccountsPageContent />
}


import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveWorkspaceContext } from '@/lib/auth/resolve-workspace-role'

export default async function ProjectAccessLayout({
  children,
  params,
}: {
  children: ReactNode
  params: { id: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const ws = await resolveWorkspaceContext({ supabase: supabase as any, userId: user.id })
  if (ws.role !== 'team_member') {
    return children
  }

  const { data: membership } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership?.id) {
    redirect('/dashboard')
  }

  return children
}

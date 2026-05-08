import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { customRolesIncludeManageMembers } from '@/lib/permissions/can-manage-organization-roles'

function permissionListHasRemoveUsers(perms: unknown): boolean {
  if (!Array.isArray(perms)) return false
  return perms.some((p) => typeof p === 'string' && ['account.users.remove', 'account.members.manage'].includes(p.toLowerCase()))
}

function rank(systemRole: string) {
  if (systemRole === 'Owner') return 3
  if (systemRole === 'Admin') return 2
  return 1
}

export async function DELETE(_request: Request, context: { params: Promise<{ organizationId: string; memberId: string }> }) {
  const { organizationId, memberId } = await context.params
  if (!organizationId || !memberId) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })

  const supabase = createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Load inviter membership + default-role perms + custom roles
  const [{ data: inviter }, { data: defaults }, { data: customRoles }, { data: target }] = await Promise.all([
    admin
      .from('organization_members')
      .select('system_role,custom_roles')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .maybeSingle(),
    admin.from('organization_default_roles').select('role,permissions').eq('organization_id', organizationId),
    admin.from('organization_roles').select('id,name,permissions').eq('organization_id', organizationId),
    admin
      .from('organization_members')
      .select('id,user_id,system_role')
      .eq('organization_id', organizationId)
      .eq('id', memberId)
      .maybeSingle(),
  ])

  if (!inviter?.system_role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!target?.id) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (String(target.user_id) === user.id) return NextResponse.json({ error: 'You cannot remove yourself.' }, { status: 400 })

  const inviterSystemRole = String((inviter as any).system_role ?? 'Member')
  const inviterAssigned = Array.isArray((inviter as any).custom_roles)
    ? (((inviter as any).custom_roles as unknown[]).filter((x) => typeof x === 'string') as string[])
    : []

  const defaultPermsByName = new Map<string, unknown>()
  for (const row of defaults ?? []) {
    const r = String((row as any)?.role ?? '').trim().toLowerCase()
    if (!r) continue
    defaultPermsByName.set(r, (row as any)?.permissions)
  }

  const canRemoveUsers =
    inviterSystemRole === 'Owner'
      ? true
      : inviterSystemRole === 'Admin'
        ? permissionListHasRemoveUsers(defaultPermsByName.get('admin'))
        : customRolesIncludeManageMembers(inviterAssigned, (customRoles ?? []) as any)

  if (!canRemoveUsers) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const targetSystemRole = String((target as any)?.system_role ?? 'Member')
  if (rank(targetSystemRole) >= rank(inviterSystemRole)) {
    return NextResponse.json({ error: 'You can only remove members with a lower role level.' }, { status: 403 })
  }

  const { error: delError } = await admin.from('organization_members').delete().eq('organization_id', organizationId).eq('id', memberId)
  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })

  return NextResponse.json({ ok: true } satisfies { ok: true })
}


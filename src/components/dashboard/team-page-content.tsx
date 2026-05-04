'use client'

import { useEffect, useMemo, useState } from 'react'
import { Mail, Plus, Search, Shield, UserPlus, Users, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase/client'
import { PermissionsPageContent } from '@/components/settings/permissions-page-content'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

type WorkspaceRole = 'Admin' | 'Project Manager' | 'Member'

type WorkspaceMember = {
  id: string
  userId: string
  fullName: string
  email: string
  roles: WorkspaceRole[]
  joinedAt: string
  projects: string[]
}

type PendingInvite = {
  id: string
  email: string
  sentAt: string
}

type OrganizationRoleRow = {
  id: string
  name: string
  permissions: unknown
}

type AccessibleOrg = { id: string; slug: string; name: string; created_at: string }

function normalizeRoleName(input: string | null | undefined) {
  return (input || '').trim().replace(/\s+/g, ' ')
}

function asPermissionStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((x): x is string => typeof x === 'string')
}

function permissionsIncludeAccountMembersManage(permissions: unknown): boolean {
  return asPermissionStrings(permissions).some((p) => p.toLowerCase() === 'account.members.manage')
}

const BUILT_IN_WORKSPACE_ROLE_NAMES: WorkspaceRole[] = ['Admin', 'Project Manager', 'Member']

function isBuiltInWorkspaceRoleName(name: string): name is WorkspaceRole {
  return (BUILT_IN_WORKSPACE_ROLE_NAMES as readonly string[]).includes(normalizeRoleName(name))
}

/** Uses `organization_members.roles` only (ignores legacy `role`). */
function computeCanManageRoles(
  currentUserId: string,
  memberRows: any[] | null | undefined,
  customOrgRoles: OrganizationRoleRow[],
  defaultRoleRows: Array<{ role: string; permissions: unknown }> | null | undefined,
): boolean {
  const row = (memberRows ?? []).find((m: any) => m.user_id === currentUserId)
  if (!row) return false

  const assigned: string[] = Array.isArray(row.roles)
    ? (row.roles.filter((x: any) => typeof x === 'string') as string[])
    : []

  const normalizedAssigned = (assigned.length > 0 ? assigned : ['Member']).map((r) => normalizeRoleName(r))

  if (normalizedAssigned.some((r) => r === 'Admin')) return true

  const defaultByRole = new Map<string, unknown>()
  for (const d of defaultRoleRows ?? []) {
    if (d?.role != null) defaultByRole.set(normalizeRoleName(String(d.role)), d.permissions)
  }

  const customByNameLower = new Map<string, OrganizationRoleRow>()
  for (const r of customOrgRoles) {
    customByNameLower.set(normalizeRoleName(r.name).toLowerCase(), r)
  }

  for (const name of normalizedAssigned) {
    if (isBuiltInWorkspaceRoleName(name)) {
      const perms = defaultByRole.get(name)
      if (permissionsIncludeAccountMembersManage(perms)) return true
      continue
    }

    const custom = customByNameLower.get(name.toLowerCase())
    if (custom && permissionsIncludeAccountMembersManage(custom.permissions)) return true
  }

  return false
}

function formatRelativeDate(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return 'Unknown'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function TeamPageContent({
  organizationId,
  currentUserId,
  organizations,
  role = 'team_member',
}: {
  organizationId: string
  currentUserId: string
  organizations: AccessibleOrg[]
  role?: 'tenant_admin' | 'team_member'
}) {
  const [query, setQuery] = useState('')
  const [membersList, setMembersList] = useState<WorkspaceMember[]>([])
  const [invitesList, setInvitesList] = useState<PendingInvite[]>([])
  const [, setCustomRoles] = useState<OrganizationRoleRow[]>([])
  const [canManageRoles, setCanManageRoles] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteResendLink, setInviteResendLink] = useState<string | null>(null)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [draftRoles, setDraftRoles] = useState<WorkspaceRole[]>(['Member'])
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(organizationId)
  const [activeTab, setActiveTab] = useState<'members' | 'teams' | 'roles'>('members')
  const [teamsQuery, setTeamsQuery] = useState('')

  useEffect(() => {
    setSelectedOrganizationId(organizationId)
  }, [organizationId])

  const roleOptions = useMemo(() => {
    const builtIns: Array<{ value: WorkspaceRole; label: string }> = [
      { value: 'Admin', label: 'Admin' },
      { value: 'Project Manager', label: 'Project Manager' },
      { value: 'Member', label: 'Member' },
    ]
    return { builtIns }
  }, [])

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return membersList
    return membersList.filter((m) => {
      return m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    })
  }, [query, membersList])

  function initials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    const a = parts[0]?.[0] ?? 'U'
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
    return (a + b).toUpperCase()
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const [
          { data: orgRolesData, error: orgRolesError },
          { data: defaultRoleRows, error: defaultRolesError },
          { data: members, error: membersError },
          { data: invites, error: invitesError },
        ] = await Promise.all([
          supabase
            .from('organization_roles')
            .select('id,name,permissions')
            .eq('organization_id', selectedOrganizationId)
            .order('created_at', { ascending: true }),
          supabase
            .from('organization_default_roles')
            .select('role,permissions')
            .eq('organization_id', selectedOrganizationId),
          supabase
            .from('organization_members')
            .select(
              `
                id,
                organization_id,
                user_id,
                roles,
                joined_at,
                profiles:user_id (
                  full_name,
                  email
                )
              `,
            )
            .eq('organization_id', selectedOrganizationId)
            .order('joined_at', { ascending: true }),
          supabase
            .from('team_invitations')
            .select('id,email,created_at,status')
            .eq('organization_id', selectedOrganizationId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false }),
        ])

        if (orgRolesError) throw orgRolesError
        if (defaultRolesError) throw defaultRolesError
        if (membersError) throw membersError
        if (invitesError) throw invitesError

        const customRolesList = (orgRolesData ?? []) as OrganizationRoleRow[]
        const canManage = computeCanManageRoles(
          currentUserId,
          members as any[],
          customRolesList,
          defaultRoleRows as Array<{ role: string; permissions: unknown }> | null | undefined,
        )

        const memberUserIds = (members ?? []).map((m: any) => m.user_id as string)

        const { data: projectMembers, error: projectMembersError } = await supabase
          .from('project_members')
          .select(
            `
            user_id,
            projects:project_id (
              id,
              name
            )
          `,
          )
          .eq('organization_id', selectedOrganizationId)
          .in('user_id', memberUserIds.length > 0 ? memberUserIds : ['00000000-0000-0000-0000-000000000000'])

        if (projectMembersError) throw projectMembersError

        const projectsByUserId = new Map<string, string[]>()
        for (const pm of projectMembers ?? []) {
          const uid = (pm as any).user_id as string
          const projectName = (pm as any).projects?.name as string | undefined
          if (!uid || !projectName) continue
          const arr = projectsByUserId.get(uid) ?? []
          arr.push(projectName)
          projectsByUserId.set(uid, arr)
        }

        const normalizedMembers: WorkspaceMember[] = (members ?? []).map((m: any) => {
          const fullName = (m.profiles?.full_name as string | null) ?? 'Unknown User'
          const email = (m.profiles?.email as string | null) ?? '—'
          const fromRoles = Array.isArray(m.roles)
            ? (m.roles.filter((x: any) => typeof x === 'string') as string[])
            : []
          const roles = (fromRoles.length > 0 ? fromRoles : ['Member']) as WorkspaceRole[]
          return {
            id: m.id,
            userId: m.user_id,
            fullName,
            email,
            roles,
            joinedAt: formatRelativeDate(m.joined_at),
            projects: projectsByUserId.get(m.user_id) ?? [],
          }
        })

        const normalizedInvites: PendingInvite[] = (invites ?? []).map((i: any) => ({
          id: i.id,
          email: i.email,
          sentAt: formatRelativeDate(i.created_at),
        }))

        if (!cancelled) {
          setCustomRoles(customRolesList)
          setCanManageRoles(canManage)
          setMembersList(normalizedMembers)
          setInvitesList(normalizedInvites)
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? 'Failed to load team data.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [selectedOrganizationId, currentUserId])

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase()
    if (!email) return

    setError(null)
    setInviteResendLink(null)

    const optimisticId = `optimistic-invite-${Date.now()}`
    setInvitesList((prev) => [{ id: optimisticId, email, sentAt: 'Just now' }, ...prev])
    setInviteEmail('')
    setIsInviteModalOpen(false)

    try {
      if (invitesList.some((i) => i.email.toLowerCase() === email)) {
        throw new Error('An invite is already pending for this email.')
      }

      const res = await fetch('/api/tenant/invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, organizationId: selectedOrganizationId }),
      })

      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(payload?.error ?? 'Failed to create invite.')
      }

      const inserted = payload?.invite
      if (!inserted?.id) throw new Error(payload?.error ?? payload?.warning ?? 'Failed to create invite.')

      setInvitesList((prev) =>
        prev.map((i) =>
          i.id === optimisticId
            ? { id: inserted.id, email: inserted.email, sentAt: formatRelativeDate(inserted.created_at) }
            : i,
        ),
      )

      if (payload?.warning) {
        setError(String(payload.warning))
        if (payload?.actionLink) {
          setInviteResendLink(String(payload.actionLink))
        }
      }
    } catch (e: any) {
      setInvitesList((prev) => prev.filter((i) => i.id !== optimisticId))
      setError(e?.message ?? 'Failed to create invite.')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    const member = membersList.find((m) => m.id === memberId)
    if (!member) return
    if (member.userId === currentUserId) {
      setError('You cannot remove your own account from the organization.')
      return
    }
    if (!window.confirm(`Remove ${member.fullName} from this organization? This cannot be undone.`)) return

    setError(null)
    const prev = membersList
    setMembersList((cur) => cur.filter((m) => m.id !== memberId))

    try {
      const { error: delError } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId)
        .eq('organization_id', selectedOrganizationId)

      if (delError) throw delError
    } catch (e: any) {
      setMembersList(prev)
      setError(e?.message ?? 'Failed to remove member.')
    }
  }

  const handleRolesChange = async (memberId: string, roles: WorkspaceRole[]) => {
    const member = membersList.find((m) => m.id === memberId)
    if (!member) return
    if (!roles || roles.length === 0) {
      setError('Select at least one role.')
      return
    }

    setError(null)
    const prev = membersList
    setMembersList((cur) => cur.map((m) => (m.id === memberId ? { ...m, roles } : m)))
    setEditingMemberId(null)

    try {
      const primary = roles[0]
      const { error: updateError } = await supabase
        .from('organization_members')
        .update({ role: primary, roles })
        .eq('id', memberId)
        .eq('organization_id', selectedOrganizationId)

      if (updateError) throw updateError
    } catch (e: any) {
      setMembersList(prev)
      setError(e?.message ?? 'Failed to update role.')
    }
  }

  const canInvite = role === 'tenant_admin'

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div>{error}</div>
          {inviteResendLink ? (
            <div className="mt-3 space-y-2">
              <div className="text-xs text-red-700/80">Resend link (copy and send to the user):</div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input value={inviteResendLink} readOnly className="bg-white text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(inviteResendLink)
                    } catch {
                      // ignore
                    }
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Team</h1>
          <p className="mt-2 text-gray-600 max-w-2xl">
            People in your workspace—members, teams, roles, and pending invitations.
          </p>
          {organizations.length > 1 ? (
            <div className="mt-4 max-w-sm">
              <label className="mb-1 block text-sm font-medium text-gray-700">Workspace</label>
              <Select value={selectedOrganizationId} onValueChange={(v) => setSelectedOrganizationId(v)}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name} ({o.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        {canInvite ? (
          <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
            <DialogTrigger asChild>
              <Button className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white">
                <UserPlus className="mr-2 h-4 w-4" />
                Invite user
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Email address</label>
                  <Input
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => void handleInvite()} className="bg-blue-600 hover:bg-blue-700">
                    Send Invite
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <div className="border-b border-gray-200">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={[
              'pb-3 text-sm font-medium',
              activeTab === 'members'
                ? 'text-gray-900 border-b-2 border-[#7a2233]'
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            Members
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('teams')}
            className={[
              'pb-3 text-sm font-medium',
              activeTab === 'teams'
                ? 'text-gray-900 border-b-2 border-[#7a2233]'
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            Teams
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={[
              'pb-3 text-sm font-medium',
              activeTab === 'roles'
                ? 'text-gray-900 border-b-2 border-[#7a2233]'
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            Roles
          </button>
        </div>
      </div>

      {activeTab === 'roles' ? (
        canManageRoles ? (
          <div className="pt-2">
            <PermissionsPageContent organizationId={selectedOrganizationId} embedded />
          </div>
        ) : (
          <div className="pt-6">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-gray-900">Roles</CardTitle>
                <CardDescription>Manage workspace roles and permissions.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-amber-200 bg-amber-50/80 px-6 py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                    <Shield className="h-6 w-6 text-amber-800" />
                  </div>
                  <p className="mt-4 text-base font-semibold text-gray-900">Access restricted</p>
                  <p className="mt-2 max-w-md text-sm text-gray-600">
                    You do not have permission to manage roles for this workspace. Ask an administrator if you need
                    access.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      ) : activeTab === 'teams' ? (
        <div className="pt-6">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-gray-900">Teams</CardTitle>
              <CardDescription>Group members into teams for easier management.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search teams…"
                  value={teamsQuery}
                  onChange={(e) => setTeamsQuery(e.target.value)}
                  className="border-gray-200 bg-white pl-9"
                />
              </div>

              <div className="flex min-h-[360px] items-center justify-center">
                <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mt-4 text-base font-semibold text-gray-900">No teams created yet.</div>
                  <div className="mt-1 text-sm text-gray-500">Start by creating a team!</div>
                  <Button className="mt-5 bg-blue-600 text-white hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Team
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Workspace members</CardTitle>
                <div className="rounded-lg bg-blue-50 p-2">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{membersList.length}</div>
                <p className="mt-1 text-xs text-gray-500">Active accounts in this tenant</p>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Admins</CardTitle>
                <div className="rounded-lg bg-blue-50 p-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {membersList.filter((m) => m.roles.includes('Admin')).length}
                </div>
                <p className="mt-1 text-xs text-gray-500">Tenant administrators</p>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Pending invites</CardTitle>
                <div className="rounded-lg bg-blue-50 p-2">
                  <Mail className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{invitesList.length}</div>
                <p className="mt-1 text-xs text-gray-500">Awaiting acceptance</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-gray-900">Members</CardTitle>
              <CardDescription>Search by name or email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search members…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="border-gray-200 bg-white pl-9"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                {isLoading ? (
                  <p className="py-8 text-center text-sm text-gray-500">Loading members…</p>
                ) : (
                  filteredMembers.map((m) => (
                    <div
                      key={m.id}
                      className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-slate-100 text-xs text-slate-700">
                              {initials(m.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <p className="truncate font-semibold text-gray-900">{m.fullName}</p>
                          <div className="flex flex-wrap items-center gap-1">
                            {(editingMemberId === m.id ? draftRoles : m.roles).map((r) => (
                              <Badge
                                key={r}
                                className="border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700"
                              >
                                {r}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <p className="truncate text-sm text-gray-500">{m.email}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-gray-400">Projects:</span>
                          {m.projects.length === 0 ? (
                            <span className="text-xs text-gray-500">None</span>
                          ) : (
                            m.projects.map((project, idx) => (
                              <Badge key={idx} variant="outline" className="border-gray-200 bg-gray-50 text-xs">
                                {project}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-xs text-gray-500">Joined {m.joinedAt}</span>
                        {editingMemberId === m.id ? (
                          <div className="flex gap-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                                  Select roles
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-[220px]">
                                {roleOptions.builtIns.map((opt) => {
                                  const checked = draftRoles.includes(opt.value)
                                  return (
                                    <DropdownMenuCheckboxItem
                                      key={opt.value}
                                      checked={checked}
                                      onSelect={(e) => e.preventDefault()}
                                      onCheckedChange={(next) => {
                                        setDraftRoles((cur) => {
                                          if (next) return Array.from(new Set([...cur, opt.value]))
                                          const filtered = cur.filter((x) => x !== opt.value)
                                          return filtered.length > 0 ? filtered : ['Member']
                                        })
                                      }}
                                    >
                                      {opt.label}
                                    </DropdownMenuCheckboxItem>
                                  )
                                })}
                                <DropdownMenuSeparator />
                                <div className="px-2 py-1 text-[11px] text-slate-500">Select one or more roles.</div>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void handleRolesChange(m.id, draftRoles)}
                              className="h-7 px-2 text-xs"
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingMemberId(null)
                                setDraftRoles(m.roles)
                              }}
                              className="h-7 px-2 text-xs"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingMemberId(m.id)
                                setDraftRoles(m.roles.length > 0 ? m.roles : ['Member'])
                              }}
                              className="h-7 px-2 text-xs"
                            >
                              Edit Roles
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => void handleRemoveMember(m.id)}
                              className="h-7 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                              disabled={m.userId === currentUserId}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {!isLoading && filteredMembers.length === 0 && (
                  <p className="py-8 text-center text-sm text-gray-500">No members found.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-gray-900">Pending Invites</CardTitle>
              <CardDescription>Manage pending invitations</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="py-8 text-center text-sm text-gray-500">Loading invites…</p>
              ) : invitesList.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">No pending invites.</p>
              ) : (
                <div className="space-y-2">
                  {invitesList.map((invite, idx) => (
                    <div
                      key={invite.id ?? idx}
                      className="flex items-center rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{invite.email}</p>
                        <p className="text-sm text-gray-500">Sent {invite.sentAt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

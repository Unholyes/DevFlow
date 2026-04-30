'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bot, Mail, Search, Shield, UserPlus, Users, Trash2, X, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase/client'
import { PermissionsPageContent } from '@/components/settings/permissions-page-content'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

type BuiltInWorkspaceRole = 'admin' | 'member' | 'ai_assistant'
type WorkspaceRole = BuiltInWorkspaceRole | (string & { __customRoleBrand?: never })

type WorkspaceMember = {
  id: string
  userId: string
  fullName: string
  email: string
  role: WorkspaceRole
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

type RolePermission =
  | 'account.members.manage'
  | 'sdlc.sprints.create'
  | 'sdlc.backlog.manage'
  | 'projects.archive'
  | 'dev.repo.access'
  | 'dev.cicd.trigger'
  | 'dev.env.manage'
  | 'system.api_tokens.generate'
  | 'system.integrations.manage'

const ROLE_PERMISSION_CATALOG: Array<{
  id: RolePermission
  label: string
  description: string
}> = [
  {
    id: 'account.members.manage',
    label: 'Manage members',
    description: 'Can add/remove members and update member roles for this organization.',
  },
  {
    id: 'sdlc.sprints.create',
    label: 'Create sprints',
    description: 'Can create sprints and plan sprint work.',
  },
  {
    id: 'sdlc.backlog.manage',
    label: 'Backlog management',
    description: 'Can create, edit, and prioritize backlog items.',
  },
  {
    id: 'projects.archive',
    label: 'Archive projects',
    description: 'Can archive projects in this organization.',
  },
  {
    id: 'dev.repo.access',
    label: 'Repository access',
    description: 'Can view and access connected repositories.',
  },
  {
    id: 'dev.cicd.trigger',
    label: 'Trigger CI/CD pipelines',
    description: 'Can trigger CI/CD workflows and pipeline runs.',
  },
  {
    id: 'dev.env.manage',
    label: 'Manage environment variables',
    description: 'Can manage environment variables for deployments.',
  },
  {
    id: 'system.api_tokens.generate',
    label: 'Generate API tokens',
    description: 'Can generate and manage API tokens.',
  },
  {
    id: 'system.integrations.manage',
    label: 'Integration setup',
    description: 'Can configure and manage integrations.',
  },
]

function normalizeRoleName(input: string) {
  return input.trim().replace(/\s+/g, ' ')
}

function isNonEmptyStringArray(v: unknown): v is string[] {
  if (!Array.isArray(v)) return false
  return v.every((x) => typeof x === 'string' && x.trim().length > 0)
}

function formatRelativeDate(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return 'Unknown'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

type AccessibleOrg = { id: string; slug: string; name: string; created_at: string }

export function AccountsPageContent({
  organizationId,
  currentUserId,
  organizations,
}: {
  organizationId: string
  currentUserId: string
  organizations: AccessibleOrg[]
}) {
  const [activeTab, setActiveTab] = useState<'members' | 'teams' | 'roles'>('members')
  const [teamsQuery, setTeamsQuery] = useState('')

  const [isAssignRoleOpen, setIsAssignRoleOpen] = useState(false)
  const [assignRoleName, setAssignRoleName] = useState('Member')
  const [assignQuery, setAssignQuery] = useState('')
  const [assignSelectedUserIds, setAssignSelectedUserIds] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>(organizationId)
  const [membersList, setMembersList] = useState<WorkspaceMember[]>([])
  const [invitesList, setInvitesList] = useState<PendingInvite[]>([])
  const [customRoles, setCustomRoles] = useState<OrganizationRoleRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [newRole, setNewRole] = useState<WorkspaceRole>('member')


  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false)
  const [roleName, setRoleName] = useState('')
  const [selectedRolePermissions, setSelectedRolePermissions] = useState<RolePermission[]>([])
  const [isSubmittingRole, setIsSubmittingRole] = useState(false)
  const [rolePermissionQuery, setRolePermissionQuery] = useState('')

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return membersList
    return membersList.filter((m) => {
      return m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    })
  }, [query, membersList])

  const assignCandidates = useMemo(() => {
    const q = assignQuery.trim().toLowerCase()
    const base = membersList
      .map((m) => ({ id: m.userId, name: m.fullName, email: m.email }))
      .filter((m) => m.id && !assignSelectedUserIds.includes(m.id))
    if (!q) return base.slice(0, 8)
    return base
      .filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
      .slice(0, 8)
  }, [assignQuery, assignSelectedUserIds, membersList])

  const assignSelectedUsers = useMemo(() => {
    const byId = new Map(membersList.map((m) => [m.userId, m] as const))
    return assignSelectedUserIds
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((m) => ({
        id: m!.userId,
        name: m!.fullName,
      }))
  }, [assignSelectedUserIds, membersList])

  function initials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    const a = parts[0]?.[0] ?? 'U'
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
    return (a + b).toUpperCase()
  }

  const roleOptions = useMemo(() => {
    const builtIns: Array<{ value: BuiltInWorkspaceRole; label: string }> = [
      { value: 'admin', label: 'Admin' },
      { value: 'member', label: 'Member' },
      { value: 'ai_assistant', label: 'AI Assistant' },
    ]

    const custom = customRoles
      .map((r) => normalizeRoleName(r.name))
      .filter(Boolean)
      .filter((name, idx, all) => all.findIndex((x) => x.toLowerCase() === name.toLowerCase()) === idx)
      .filter((name) => !builtIns.some((b) => b.value.toLowerCase() === name.toLowerCase()))
      .map((name) => ({ value: name as WorkspaceRole, label: name }))

    return { builtIns, custom }
  }, [customRoles])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const [{ data: roles, error: rolesError }, { data: members, error: membersError }, { data: invites, error: invitesError }] =
          await Promise.all([
            supabase
              .from('organization_roles')
              .select('id,name,permissions')
              .eq('organization_id', selectedOrganizationId)
              .order('created_at', { ascending: true }),
            supabase
              .from('organization_members')
              .select(
                `
                id,
                organization_id,
                user_id,
                role,
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

        if (rolesError) throw rolesError
        if (membersError) throw membersError
        if (invitesError) throw invitesError

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
          return {
            id: m.id,
            userId: m.user_id,
            fullName,
            email,
            role: (m.role ?? 'member') as WorkspaceRole,
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
          setCustomRoles((roles ?? []) as OrganizationRoleRow[])
          setMembersList(normalizedMembers)
          setInvitesList(normalizedInvites)
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? 'Failed to load accounts data.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [selectedOrganizationId])

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase()
    if (!email) return

    setError(null)

    // IMPORTANT: This action creates a Pending Invite (team_invitations),
    // not an immediate organization_members row.
    const optimisticId = `optimistic-invite-${Date.now()}`
    setInvitesList((prev) => [{ id: optimisticId, email, sentAt: 'Just now' }, ...prev])
    setInviteEmail('')
    setIsInviteModalOpen(false)

    try {
      // Fast client-side guard (server enforces too).
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
      }
    } catch (e: any) {
      setInvitesList((prev) => prev.filter((i) => i.id !== optimisticId))
      setError(e?.message ?? 'Failed to create invite.')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    const member = membersList.find((m) => m.id === memberId)
    if (!member) return
    if (member.role === 'ai_assistant') return
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

  const handleRevokeInvite = async (inviteId: string) => {
    if (!window.confirm('Revoke this invite?')) return

    setError(null)
    const prev = invitesList
    setInvitesList((cur) => cur.filter((i) => i.id !== inviteId))

    try {
      const { error: revokeError } = await supabase
        .from('team_invitations')
        .update({ status: 'expired' })
        .eq('id', inviteId)
        .eq('organization_id', selectedOrganizationId)

      if (revokeError) throw revokeError
    } catch (e: any) {
      setInvitesList(prev)
      setError(e?.message ?? 'Failed to revoke invite.')
    }
  }

  const handleRoleChange = async (memberId: string, role: WorkspaceRole) => {
    const member = membersList.find((m) => m.id === memberId)
    if (!member) return
    if (member.role === 'ai_assistant') return
    if (member.userId === currentUserId) {
      setError('You cannot change your own role.')
      return
    }

    setError(null)
    const prev = membersList
    setMembersList((cur) => cur.map((m) => (m.id === memberId ? { ...m, role } : m)))
    setEditingMemberId(null)

    try {
      const { error: updateError } = await supabase
        .from('organization_members')
        .update({ role })
        .eq('id', memberId)
        .eq('organization_id', selectedOrganizationId)

      if (updateError) throw updateError
    } catch (e: any) {
      setMembersList(prev)
      setError(e?.message ?? 'Failed to update role.')
    }
  }

  const handleCreateRole = async () => {
    const name = normalizeRoleName(roleName)
    const permissions = selectedRolePermissions

    if (!name) {
      setError('Role name is required.')
      return
    }
    if (permissions.length === 0) {
      setError('Select at least one permission.')
      return
    }

    const allExisting = [
      ...roleOptions.builtIns.map((r) => r.value),
      ...roleOptions.custom.map((r) => r.value),
    ].map((r) => r.toLowerCase())
    if (allExisting.includes(name.toLowerCase())) {
      setError('That role already exists.')
      return
    }

    setError(null)
    setIsSubmittingRole(true)

    try {
      const { data, error: insertError } = await supabase
        .from('organization_roles')
        .insert({
          organization_id: selectedOrganizationId,
          name,
          permissions,
        })
        .select('id,name,permissions')
        .single()

      if (insertError) throw insertError

      setCustomRoles((prev) => [...prev, data as OrganizationRoleRow])
      setRoleName('')
      setSelectedRolePermissions([])
      setIsAddRoleModalOpen(false)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create role.')
    } finally {
      setIsSubmittingRole(false)
    }
  }

  const getRoleBadge = (role: WorkspaceRole) => {
    switch (role) {
      case 'admin':
        return <Badge className="border-0 bg-blue-600 text-white">Admin</Badge>
      case 'ai_assistant':
        return (
          <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700">
            <span className="inline-flex items-center gap-1">
              <Bot className="h-3.5 w-3.5" />
              AI Assistant
            </span>
          </Badge>
        )
      case 'member':
        return <Badge className="border border-gray-200 bg-gray-50 text-gray-700">Member</Badge>
      default:
        return <Badge className="border border-purple-200 bg-purple-50 text-purple-700">{role}</Badge>
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Accounts</h1>
          <p className="mt-2 text-gray-600 max-w-2xl">
            Tenant admin view for managing workspace members and invitations.
          </p>
          {organizations.length > 1 ? (
            <div className="mt-4 max-w-sm">
              <label className="block text-sm font-medium text-gray-700 mb-1">Workspace</label>
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {activeTab === 'members' ? (
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
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Email address</label>
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
                    <Button onClick={handleInvite} className="bg-blue-600 hover:bg-blue-700">
                      Send Invite
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </div>

      <div className="border-b border-gray-200">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={[
              'pb-3 text-sm font-medium',
              activeTab === 'members' ? 'text-gray-900 border-b-2 border-[#7a2233]' : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            Members
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('teams')}
            className={[
              'pb-3 text-sm font-medium',
              activeTab === 'teams' ? 'text-gray-900 border-b-2 border-[#7a2233]' : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            Teams
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={[
              'pb-3 text-sm font-medium',
              activeTab === 'roles' ? 'text-gray-900 border-b-2 border-[#7a2233]' : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            Roles
          </button>
        </div>
      </div>

      {activeTab === 'roles' ? (
        <div className="pt-2">
          <div className="mb-3 flex items-center justify-end">
            <Dialog
              open={isAssignRoleOpen}
              onOpenChange={(v) => {
                setIsAssignRoleOpen(v)
                if (!v) {
                  setAssignQuery('')
                  setAssignSelectedUserIds([])
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9"
                  onClick={() => {
                    setAssignRoleName('Member')
                  }}
                >
                  Assign role
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg p-0">
                <DialogHeader className="space-y-1 border-b border-slate-200 px-6 py-5 text-left">
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <DialogTitle className="text-lg">Assign this role</DialogTitle>
                      <DialogDescription className="mt-1">
                        Select one or multiple employees to assign to this role{' '}
                        <span className="font-medium text-[#7a2233]">“{assignRoleName}”</span>.
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4 px-6 py-5">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap gap-2">
                      {assignSelectedUsers.length === 0 ? (
                        <div className="text-sm text-slate-500">No one selected yet.</div>
                      ) : (
                        assignSelectedUsers.map((u) => (
                          <span
                            key={u.id}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                          >
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="bg-white text-[10px] text-slate-600">
                                {initials(u.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="max-w-[180px] truncate">{u.name}</span>
                            <button
                              type="button"
                              className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-500 hover:text-slate-700"
                              onClick={() => setAssignSelectedUserIds((cur) => cur.filter((id) => id !== u.id))}
                              aria-label={`Remove ${u.name}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={assignQuery}
                        onChange={(e) => setAssignQuery(e.target.value)}
                        placeholder="Search for an individual or team"
                        className="pl-9"
                      />
                    </div>

                    {assignCandidates.length > 0 ? (
                      <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
                        {assignCandidates.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
                            onClick={() => setAssignSelectedUserIds((cur) => [...cur, c.id])}
                          >
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="bg-slate-100 text-xs text-slate-700">
                                {initials(c.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-slate-900">{c.name}</span>
                              <span className="block truncate text-xs text-slate-500">{c.email}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <DialogFooter className="border-t border-slate-200 px-6 py-5">
                  <Button
                    className="w-full bg-[#7a2233] text-white hover:bg-[#651c2a]"
                    disabled={assignSelectedUserIds.length === 0}
                    onClick={() => setIsAssignRoleOpen(false)}
                  >
                    Assign
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <PermissionsPageContent organizationId={selectedOrganizationId} embedded />
        </div>
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
                  className="pl-9 border-gray-200 bg-white"
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
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Workspace members</CardTitle>
            <div className="rounded-lg bg-blue-50 p-2">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{membersList.length}</div>
            <p className="text-xs text-gray-500 mt-1">Active accounts in this tenant</p>
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
              {membersList.filter((m) => m.role === 'admin').length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Tenant administrators</p>
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
            <p className="text-xs text-gray-500 mt-1">Awaiting acceptance</p>
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
              className="pl-9 border-gray-200 bg-white"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            {isLoading ? (
              <p className="text-center text-sm text-gray-500 py-8">Loading members…</p>
            ) : (
              filteredMembers.map((m) => (
              <div
                key={m.id}
                className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-slate-100 text-xs text-slate-700">
                        {initials(m.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-semibold text-gray-900 truncate">{m.fullName}</p>
                    {editingMemberId === m.id ? (
                      <Select value={newRole} onValueChange={(value) => setNewRole(value as WorkspaceRole)}>
                        <SelectTrigger className="h-6 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.builtIns.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                          {roleOptions.custom.length > 0 && (
                            <>
                              {roleOptions.custom.map((r) => (
                                <SelectItem key={r.value} value={r.value}>
                                  {r.label}
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      getRoleBadge(m.role)
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{m.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-400">Projects:</span>
                    {m.projects.length === 0 ? (
                      <span className="text-xs text-gray-500">None</span>
                    ) : (
                      m.projects.map((project, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs bg-gray-50 border-gray-200">
                          {project}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-500">Joined {m.joinedAt}</span>
                  {editingMemberId === m.id ? (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleRoleChange(m.id, newRole)}
                        className="h-7 px-2 text-xs"
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingMemberId(null)} className="h-7 px-2 text-xs">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (m.role === 'ai_assistant') return
                          if (m.userId === currentUserId) return
                          setEditingMemberId(m.id)
                          setNewRole(m.role)
                        }}
                        className="h-7 px-2 text-xs"
                        disabled={m.role === 'ai_assistant' || m.userId === currentUserId}
                      >
                        Edit Role
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void handleRemoveMember(m.id)}
                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={m.role === 'ai_assistant' || m.userId === currentUserId}
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
              <p className="text-center text-sm text-gray-500 py-8">No members found.</p>
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
            <p className="text-center text-sm text-gray-500 py-8">Loading invites…</p>
          ) : invitesList.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-8">No pending invites.</p>
          ) : (
            <div className="space-y-2">
              {invitesList.map((invite, idx) => (
                <div
                  key={invite.id ?? idx}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{invite.email}</p>
                    <p className="text-sm text-gray-500">Sent {invite.sentAt}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void handleRevokeInvite(invite.id)}
                    className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Revoke
                  </Button>
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


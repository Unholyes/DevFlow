'use client'

import { useEffect, useMemo, useState } from 'react'
import { Mail, Search, Shield, UserPlus, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase/client'
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

function formatRelativeDate(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return 'Unknown'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function TeamPageContent({ organizationId }: { organizationId: string }) {
  const [query, setQuery] = useState('')
  const [membersList, setMembersList] = useState<WorkspaceMember[]>([])
  const [invitesList, setInvitesList] = useState<PendingInvite[]>([])
  const [, setCustomRoles] = useState<OrganizationRoleRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [isInviting, setIsInviting] = useState(false)

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
        const [{ data: roles, error: rolesError }, { data: members, error: membersError }, { data: invites, error: invitesError }] =
          await Promise.all([
            supabase
              .from('organization_roles')
              .select('id,name,permissions')
              .eq('organization_id', organizationId)
              .order('created_at', { ascending: true }),
            supabase
              .from('organization_members')
              .select(
                `
                id,
                organization_id,
                user_id,
                role,
                roles,
                joined_at,
                profiles:user_id (
                  full_name,
                  email
                )
              `,
              )
              .eq('organization_id', organizationId)
              .order('joined_at', { ascending: true }),
            supabase
              .from('team_invitations')
              .select('id,email,created_at,status')
              .eq('organization_id', organizationId)
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
          .eq('organization_id', organizationId)
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
          const roles = Array.isArray(m.roles)
            ? (m.roles.filter((x: any) => typeof x === 'string') as string[])
            : typeof m.role === 'string'
              ? [m.role]
              : ['Member']
          return {
            id: m.id,
            userId: m.user_id,
            fullName,
            email,
            roles: (roles.length > 0 ? roles : ['Member']) as WorkspaceRole[],
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
  }, [organizationId])

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase()
    if (!email) return

    setError(null)
    setIsInviting(true)

    const optimisticId = `optimistic-invite-${Date.now()}`
    setInvitesList((prev) => [{ id: optimisticId, email, sentAt: 'Just now' }, ...prev])
    setInviteEmail('')
    setIsInviteModalOpen(false)

    try {
      if (invitesList.some((i) => i.email.toLowerCase() === email)) {
        throw new Error('An invite is already pending for this email.')
      }
      if (membersList.some((m) => m.email.toLowerCase() === email)) {
        throw new Error('This user is already a workspace member.')
      }

      const res = await fetch('/api/tenant/invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, organizationId }),
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
    } finally {
      setIsInviting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Team</h1>
          <p className="mt-2 text-gray-600 max-w-2xl">
            People in your DevFlow workspace—see who is on which projects and manage invitations.
          </p>
        </div>
        <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white">
              <UserPlus className="mr-2 h-4 w-4" />
              Invite member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite team member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label htmlFor="team-invite-email" className="mb-1 block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <Input
                  id="team-invite-email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="border-gray-200 bg-white"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsInviteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isInviting || !inviteEmail.trim()}
                onClick={() => void handleInvite()}
              >
                Send invite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Workspace members</CardTitle>
            <div className="rounded-lg p-2" style={{ backgroundColor: 'var(--theme-primary)', opacity: 0.1 }}>
              <Users className="h-4 w-4" style={{ color: 'var(--theme-primary)' }} />
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
              {membersList.filter((m) => m.roles.includes('Admin')).length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Tenant administrators</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending invites</CardTitle>
            <div className="rounded-lg p-2" style={{ backgroundColor: 'var(--theme-primary)', opacity: 0.1 }}>
              <Mail className="h-4 w-4" style={{ color: 'var(--theme-primary)' }} />
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
                      <div className="flex flex-wrap items-center gap-1">
                        {m.roles.map((r) => (
                          <Badge
                            key={r}
                            className="border border-slate-200 bg-slate-50 text-slate-700 text-[11px] px-2 py-0.5"
                          >
                            {r}
                          </Badge>
                        ))}
                      </div>
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useMemo, useState } from 'react'
import { Mail, Search, Shield, UserPlus, Users, MoreVertical, Trash2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type WorkspaceMember = {
  id: string
  fullName: string
  email: string
  role: 'tenant_admin' | 'team_member' | 'project_manager'
  joinedAt: string
  projects: string[]
}

type PendingInvite = {
  email: string
  sentAt: string
}

// TODO: Replace with Supabase-backed data (organizations / organization_members / profiles).
const members: WorkspaceMember[] = [
  {
    id: '1',
    fullName: 'John Smith',
    email: 'john.smith@example.com',
    role: 'tenant_admin',
    joinedAt: 'Jan 15, 2024',
    projects: ['Project Alpha', 'Project Beta']
  },
  {
    id: '2',
    fullName: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    role: 'project_manager',
    joinedAt: 'Feb 3, 2024',
    projects: ['Project Alpha']
  },
  {
    id: '3',
    fullName: 'Mike Chen',
    email: 'mike.chen@example.com',
    role: 'team_member',
    joinedAt: 'Feb 10, 2024',
    projects: ['Project Beta', 'Project Gamma']
  },
  {
    id: '4',
    fullName: 'Emily Davis',
    email: 'emily.davis@example.com',
    role: 'team_member',
    joinedAt: 'Mar 1, 2024',
    projects: ['Project Alpha']
  },
  {
    id: '5',
    fullName: 'Alex Wilson',
    email: 'alex.wilson@example.com',
    role: 'team_member',
    joinedAt: 'Mar 15, 2024',
    projects: ['Project Gamma']
  },
]
const invites: PendingInvite[] = [
  { email: 'new.user@example.com', sentAt: '2 hours ago' },
  { email: 'team.lead@example.com', sentAt: '1 day ago' },
]

export function AccountsPageContent() {
  const [query, setQuery] = useState('')
  const [membersList, setMembersList] = useState<WorkspaceMember[]>(members)
  const [invitesList, setInvitesList] = useState<PendingInvite[]>(invites)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [newRole, setNewRole] = useState<WorkspaceMember['role']>('team_member')

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return membersList
    return membersList.filter((m) => {
      return m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    })
  }, [query, membersList])

  const handleInvite = () => {
    if (!inviteEmail) return
    setInvitesList([...invitesList, { email: inviteEmail, sentAt: 'Just now' }])
    setInviteEmail('')
    setIsInviteModalOpen(false)
  }

  const handleRemoveMember = (id: string) => {
    setMembersList(membersList.filter(m => m.id !== id))
  }

  const handleRevokeInvite = (email: string) => {
    setInvitesList(invitesList.filter(i => i.email !== email))
  }

  const handleRoleChange = (id: string, role: WorkspaceMember['role']) => {
    setMembersList(membersList.map(m => m.id === id ? { ...m, role } : m))
    setEditingMemberId(null)
  }

  const getRoleBadge = (role: WorkspaceMember['role']) => {
    switch (role) {
      case 'tenant_admin':
        return <Badge className="border-0 bg-blue-600 text-white">Admin</Badge>
      case 'project_manager':
        return <Badge className="border border-purple-200 bg-purple-50 text-purple-700">Project Manager</Badge>
      default:
        return <Badge className="border border-gray-200 bg-gray-50 text-gray-700">Member</Badge>
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
        </div>
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
                <Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>Cancel</Button>
                <Button onClick={handleInvite} className="bg-blue-600 hover:bg-blue-700">Send Invite</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
              {membersList.filter((m) => m.role === 'tenant_admin').length}
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
            />
          </div>

          <div className="space-y-2">
            {filteredMembers.map((m) => (
              <div
                key={m.id}
                className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900 truncate">{m.fullName}</p>
                    {editingMemberId === m.id ? (
                      <Select value={newRole} onValueChange={(value) => setNewRole(value as WorkspaceMember['role'])}>
                        <SelectTrigger className="h-6 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tenant_admin">Admin</SelectItem>
                          <SelectItem value="project_manager">Project Manager</SelectItem>
                          <SelectItem value="team_member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      getRoleBadge(m.role)
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{m.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-400">Projects:</span>
                    {m.projects.map((project, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs bg-gray-50 border-gray-200">
                        {project}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-500">Joined {m.joinedAt}</span>
                  {editingMemberId === m.id ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => handleRoleChange(m.id, newRole)} className="h-7 px-2 text-xs">
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingMemberId(null)} className="h-7 px-2 text-xs">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditingMemberId(m.id); setNewRole(m.role) }} className="h-7 px-2 text-xs">
                        Edit Role
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleRemoveMember(m.id)} className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filteredMembers.length === 0 && (
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
          {invitesList.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-8">No pending invites.</p>
          ) : (
            <div className="space-y-2">
              {invitesList.map((invite, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{invite.email}</p>
                    <p className="text-sm text-gray-500">Sent {invite.sentAt}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRevokeInvite(invite.email)}
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
    </div>
  )
}


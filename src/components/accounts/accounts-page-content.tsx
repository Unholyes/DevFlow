'use client'

import { useMemo, useState } from 'react'
import { Mail, Search, Shield, UserPlus, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type WorkspaceMember = {
  id: string
  fullName: string
  email: string
  role: 'tenant_admin' | 'team_member'
  joinedAt: string
}

type PendingInvite = {
  email: string
  sentAt: string
}

// TODO: Replace with Supabase-backed data (organizations / organization_members / profiles).
const members: WorkspaceMember[] = []
const invites: PendingInvite[] = []

export function AccountsPageContent() {
  const [query, setQuery] = useState('')

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return members
    return members.filter((m) => {
      return m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    })
  }, [query])

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Accounts</h1>
          <p className="mt-2 text-gray-600 max-w-2xl">
            Tenant admin view for managing workspace members and invitations.
          </p>
        </div>
        <Button className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white">
          <UserPlus className="mr-2 h-4 w-4" />
          Invite user
        </Button>
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
            <div className="text-2xl font-bold text-gray-900">{members.length}</div>
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
              {members.filter((m) => m.role === 'tenant_admin').length}
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
            <div className="text-2xl font-bold text-gray-900">{invites.length}</div>
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
                className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{m.fullName}</p>
                  <p className="text-sm text-gray-500 truncate">{m.email}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge
                    variant="secondary"
                    className={
                      m.role === 'tenant_admin'
                        ? 'border-0 bg-blue-600 text-white hover:bg-blue-600'
                        : 'border border-gray-200 bg-gray-50 text-gray-700 font-normal'
                    }
                  >
                    {m.role === 'tenant_admin' ? 'Admin' : 'Member'}
                  </Badge>
                  <span className="text-xs text-gray-500">Joined {m.joinedAt}</span>
                </div>
              </div>
            ))}

            {filteredMembers.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-8">No members found.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


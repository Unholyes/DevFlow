'use client'

import { useMemo, useState } from 'react'
import {
  Users,
  UserPlus,
  FolderKanban,
  Mail,
  Search,
  Shield,
  Briefcase,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type RoleFilter = 'all' | 'tenant_admin' | 'member'

type Member = {
  id: string
  name: string
  email: string
  initials: string
  role: 'tenant_admin' | 'member'
  projects: string[]
  openTasks: number
  lastActive: string
}

const members: Member[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@devflow.app',
    initials: 'SJ',
    role: 'tenant_admin',
    projects: ['E-commerce Platform', 'Customer Portal'],
    openTasks: 6,
    lastActive: 'Active now',
  },
  {
    id: '2',
    name: 'John Smith',
    email: 'john.smith@devflow.app',
    initials: 'JS',
    role: 'member',
    projects: ['E-commerce Platform', 'API Migration'],
    openTasks: 12,
    lastActive: '2h ago',
  },
  {
    id: '3',
    name: 'Sarah Jones',
    email: 'sarah.jones@devflow.app',
    initials: 'SJ',
    role: 'member',
    projects: ['Mobile App Redesign'],
    openTasks: 9,
    lastActive: '1d ago',
  },
  {
    id: '4',
    name: 'Mike Chen',
    email: 'mike.chen@devflow.app',
    initials: 'MC',
    role: 'member',
    projects: ['API Migration', 'Legacy System Upgrade'],
    openTasks: 7,
    lastActive: '30m ago',
  },
  {
    id: '5',
    name: 'Alex Brown',
    email: 'alex.brown@devflow.app',
    initials: 'AB',
    role: 'member',
    projects: ['E-commerce Platform', 'Mobile App Redesign', 'Data Analytics Dashboard'],
    openTasks: 5,
    lastActive: '5m ago',
  },
  {
    id: '6',
    name: 'Jordan Lee',
    email: 'jordan.lee@devflow.app',
    initials: 'JL',
    role: 'member',
    projects: ['Customer Portal'],
    openTasks: 4,
    lastActive: '3d ago',
  },
]

const pendingInvites = [
  { email: 'dev.new@example.com', role: 'member' as const, sent: 'Apr 8, 2026' },
  { email: 'contractor.q2@example.com', role: 'member' as const, sent: 'Apr 5, 2026' },
]

export function TeamPageContent() {
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return members.filter((m) => {
      const roleOk = roleFilter === 'all' || m.role === roleFilter
      if (!roleOk) return false
      if (!q) return true
      return (
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.projects.some((p) => p.toLowerCase().includes(q))
      )
    })
  }, [query, roleFilter])

  const stats = {
    members: members.length,
    projectsCovered: new Set(members.flatMap((m) => m.projects)).size,
    pendingInvites: pendingInvites.length,
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Team</h1>
          <p className="mt-2 text-gray-600 max-w-2xl">
            People in your DevFlow workspace—assign roles, see who is on which projects, and manage
            invitations. When your database is connected, this will sync from Supabase.
          </p>
        </div>
        <Button className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white">
          <UserPlus className="mr-2 h-4 w-4" />
          Invite member
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
            <div className="text-2xl font-bold text-gray-900">{stats.members}</div>
            <p className="text-xs text-gray-500 mt-1">Across all projects</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Projects represented</CardTitle>
            <div className="rounded-lg bg-blue-50 p-2">
              <FolderKanban className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.projectsCovered}</div>
            <p className="text-xs text-gray-500 mt-1">Unique projects with assignees</p>
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
            <div className="text-2xl font-bold text-gray-900">{stats.pendingInvites}</div>
            <p className="text-xs text-gray-500 mt-1">Awaiting acceptance</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg text-gray-900">Directory</CardTitle>
          <CardDescription>Search and filter by workspace role</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by name, email, or project…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 border-gray-200 bg-white"
              />
            </div>
            <Select
              value={roleFilter}
              onValueChange={(v) => setRoleFilter(v as RoleFilter)}
            >
              <SelectTrigger className="w-full sm:w-[200px] border-gray-200 bg-white">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="tenant_admin">Workspace admin</SelectItem>
                <SelectItem value="member">Team member</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {filtered.map((m) => (
              <div
                key={m.id}
                className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex gap-4">
                  <Avatar className="h-12 w-12 border border-gray-100">
                    <AvatarFallback className="bg-blue-50 text-sm font-semibold text-blue-700">
                      {m.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900 truncate">{m.name}</p>
                      {m.role === 'tenant_admin' ? (
                        <Badge
                          variant="secondary"
                          className="border-0 bg-blue-600 text-white hover:bg-blue-600"
                        >
                          <Shield className="mr-1 h-3 w-3" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="border border-gray-200 bg-gray-50 text-gray-700 font-normal"
                        >
                          <Briefcase className="mr-1 h-3 w-3 opacity-70" />
                          Member
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{m.email}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {m.projects.slice(0, 3).map((p) => (
                    <span
                      key={p}
                      className="inline-flex max-w-full items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700 truncate"
                      title={p}
                    >
                      {p}
                    </span>
                  ))}
                  {m.projects.length > 3 && (
                    <span className="text-xs text-gray-500 self-center">
                      +{m.projects.length - 3} more
                    </span>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
                  <span className="text-gray-600">
                    <span className="font-medium text-gray-900">{m.openTasks}</span> open tasks
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3.5 w-3.5" />
                    {m.lastActive}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="text-center text-sm text-gray-500 py-8">No members match your filters.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900">Pending invitations</CardTitle>
          <CardDescription>
            Invites sent by workspace admins. Recipients join with the developer role until you
            promote them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingInvites.map((inv) => (
            <div
              key={inv.email}
              className="flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="rounded-lg bg-white p-2 border border-gray-200">
                  <Mail className="h-4 w-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{inv.email}</p>
                  <p className="text-sm text-gray-500">Sent {inv.sent}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="border-gray-200 bg-white text-gray-700">
                  Team member
                </Badge>
                <Button variant="outline" size="sm" className="border-gray-200">
                  Resend
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

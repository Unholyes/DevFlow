'use client'

import { useMemo, useState } from 'react'
import {
  Mail,
  Briefcase,
  UserPlus,
  Search,
  Circle,
  LayoutGrid,
  Users,
  FolderKanban,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type Role = 'developer' | 'tech_lead' | 'designer' | 'tenant_admin'

interface Member {
  id: string
  name: string
  email: string
  role: Role
  initials: string
  projects: string[]
  activeTasks: number
  status: 'online' | 'away' | 'offline'
}

const ROLE_LABEL: Record<Role, string> = {
  developer: 'Developer',
  tech_lead: 'Tech Lead',
  designer: 'Designer',
  tenant_admin: 'Workspace Admin',
}

const members: Member[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@devflow.app',
    role: 'tech_lead',
    initials: 'JS',
    projects: ['E-commerce Platform', 'API Migration'],
    activeTasks: 12,
    status: 'online',
  },
  {
    id: '2',
    name: 'Sarah Jones',
    email: 'sarah.jones@devflow.app',
    role: 'developer',
    initials: 'SJ',
    projects: ['Mobile App Redesign', 'Customer Portal'],
    activeTasks: 9,
    status: 'online',
  },
  {
    id: '3',
    name: 'Mike Chen',
    email: 'mike.chen@devflow.app',
    role: 'developer',
    initials: 'MC',
    projects: ['E-commerce Platform', 'Data Analytics Dashboard'],
    activeTasks: 7,
    status: 'away',
  },
  {
    id: '4',
    name: 'Alex Brown',
    email: 'alex.brown@devflow.app',
    role: 'developer',
    initials: 'AB',
    projects: ['API Migration', 'Legacy System Upgrade'],
    activeTasks: 5,
    status: 'offline',
  },
  {
    id: '5',
    name: 'Jordan Lee',
    email: 'jordan.lee@devflow.app',
    role: 'designer',
    initials: 'JL',
    projects: ['Mobile App Redesign'],
    activeTasks: 4,
    status: 'online',
  },
  {
    id: '6',
    name: 'Riley Patel',
    email: 'riley.patel@devflow.app',
    role: 'tenant_admin',
    initials: 'RP',
    projects: ['All projects'],
    activeTasks: 0,
    status: 'online',
  },
]

function statusDot(status: Member['status']) {
  const map = {
    online: 'bg-emerald-500',
    away: 'bg-amber-400',
    offline: 'bg-gray-300',
  }
  return map[status]
}

function statusLabel(status: Member['status']) {
  const map = {
    online: 'Active',
    away: 'Away',
    offline: 'Offline',
  }
  return map[status]
}

export function TeamPageContent() {
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const q = query.trim().toLowerCase()
      const matchesQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.projects.some((p) => p.toLowerCase().includes(q))
      const matchesRole = roleFilter === 'all' || m.role === roleFilter
      return matchesQuery && matchesRole
    })
  }, [query, roleFilter])

  const onlineCount = members.filter((m) => m.status === 'online').length

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Team</h1>
          <p className="text-gray-600 max-w-2xl">
            People in your DevFlow workspace—assign roles, see who is on each project, and keep delivery
            aligned across Scrum, Kanban, and hybrid SDLC workflows.
          </p>
        </div>
        <Button className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white">
          <UserPlus className="mr-2 h-4 w-4" />
          Invite member
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="pt-6 flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Workspace members</p>
              <p className="text-2xl font-bold text-gray-900">{members.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="pt-6 flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Circle className="h-5 w-5 fill-current" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active now</p>
              <p className="text-2xl font-bold text-gray-900">{onlineCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="pt-6 flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Projects with assignees</p>
              <p className="text-2xl font-bold text-gray-900">6</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg text-gray-900">Directory</CardTitle>
              <CardDescription>
                Search by name, email, or project. Filter by role to match how your organization uses DevFlow.
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search people or projects..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9 bg-white border-gray-200"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[200px] bg-white border-gray-200">
                  <LayoutGrid className="mr-2 h-4 w-4 text-gray-500 shrink-0" />
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="developer">Developer</SelectItem>
                  <SelectItem value="tech_lead">Tech Lead</SelectItem>
                  <SelectItem value="designer">Designer</SelectItem>
                  <SelectItem value="tenant_admin">Workspace Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((member) => (
              <div
                key={member.id}
                className={cn(
                  'rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow',
                  'hover:shadow-md hover:border-blue-100'
                )}
              >
                <div className="flex gap-4">
                  <div className="relative shrink-0">
                    <Avatar className="h-14 w-14 border-2 border-gray-100">
                      <AvatarFallback className="text-sm font-semibold bg-blue-50 text-blue-700">
                        {member.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={cn(
                        'absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white',
                        statusDot(member.status)
                      )}
                      title={statusLabel(member.status)}
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">{member.name}</h3>
                      <Badge
                        variant="secondary"
                        className="font-normal bg-blue-50 text-blue-800 border-blue-100 hover:bg-blue-50"
                      >
                        {ROLE_LABEL[member.role]}
                      </Badge>
                    </div>
                    <a
                      href={`mailto:${member.email}`}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 truncate"
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      {member.email}
                    </a>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {member.projects.slice(0, 3).map((p) => (
                        <span
                          key={p}
                          className="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-xs text-gray-700 border border-gray-100"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                        <Briefcase className="h-3.5 w-3.5" />
                        {member.activeTasks} active tasks
                      </span>
                      <span className="text-xs text-gray-400">{statusLabel(member.status)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-sm text-gray-500 py-12">No members match your filters.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-blue-100 bg-gradient-to-br from-blue-50/80 to-white shadow-sm overflow-hidden">
        <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <h2 className="text-lg font-semibold text-gray-900">Grow your workspace</h2>
            <p className="text-sm text-gray-600">
              Invite developers and admins by email. They will join with the right role so project assignments
              and SDLC-specific boards stay consistent from day one.
            </p>
          </div>
          <Button variant="outline" className="border-blue-200 bg-white hover:bg-blue-50 shrink-0">
            <UserPlus className="mr-2 h-4 w-4" />
            Invite by email
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

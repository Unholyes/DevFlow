'use client'

import { useMemo, useState } from 'react'
import { Search, Shield } from 'lucide-react'
import { AccountsPageContent } from '@/components/accounts/accounts-page-content'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type AccessibleOrg = { id: string; slug: string; name: string; created_at: string }

type PermissionCategory = 'Jobs management' | 'Candidate management' | 'User management'

type PermissionRow = {
  id: string
  category: PermissionCategory
  label: string
  description?: string
}

const PERMISSIONS: PermissionRow[] = [
  // Jobs management
  { id: 'jobs.create', category: 'Jobs management', label: 'Create new job and stages' },
  { id: 'jobs.edit', category: 'Jobs management', label: 'Edit job and stages' },
  { id: 'jobs.archive', category: 'Jobs management', label: 'Archive jobs' },
  { id: 'jobs.status', category: 'Jobs management', label: 'Change job status' },

  // Candidate management
  { id: 'candidates.stage', category: 'Candidate management', label: 'Change candidate stage' },
  {
    id: 'candidates.terminal',
    category: 'Candidate management',
    label: 'Move applicant to terminal stage (Hired, Rejected, On hold)',
  },
  { id: 'candidates.messages.read', category: 'Candidate management', label: 'Read messages' },
  { id: 'candidates.messages.send', category: 'Candidate management', label: 'Send ad-hoc messages to candidates' },
  { id: 'candidates.interviews.reschedule', category: 'Candidate management', label: 'Reschedule interviews' },
  { id: 'candidates.import', category: 'Candidate management', label: 'Import applicants' },

  // User management
  { id: 'users.edit', category: 'User management', label: 'Edit user details' },
  { id: 'users.availability', category: 'User management', label: 'Participate interviews / Set calendar availability' },
]

const CATEGORY_ORDER: PermissionCategory[] = ['Jobs management', 'Candidate management', 'User management']

const ROLE_OPTIONS = [
  { id: 'all', label: 'All users' },
  { id: 'member', label: 'Member' },
  { id: 'manager', label: 'Manager' },
  { id: 'admin', label: 'Admin' },
] as const

type RoleId = (typeof ROLE_OPTIONS)[number]['id']

function groupPermissions(rows: PermissionRow[]) {
  const map = new Map<PermissionCategory, PermissionRow[]>()
  for (const r of rows) {
    const arr = map.get(r.category) ?? []
    arr.push(r)
    map.set(r.category, arr)
  }
  return CATEGORY_ORDER.map((c) => [c, map.get(c) ?? []] as const).filter(([, items]) => items.length > 0)
}

export function AccountsPageClient({
  organizationId,
  currentUserId,
  organizations,
}: {
  organizationId: string
  currentUserId: string
  organizations: AccessibleOrg[]
}) {
  const [open, setOpen] = useState(false)
  const [activeRoleId, setActiveRoleId] = useState<RoleId>('all')
  const [query, setQuery] = useState('')

  // purely UI state for now (matrix-style checkboxes)
  const [matrix, setMatrix] = useState<Record<RoleId, Set<string>>>(() => ({
    all: new Set(),
    member: new Set(),
    manager: new Set(),
    admin: new Set(),
  }))

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return PERMISSIONS
    return PERMISSIONS.filter((p) => p.label.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
  }, [query])

  const groups = useMemo(() => groupPermissions(filtered), [filtered])

  function toggle(roleId: RoleId, permissionId: string, checked: boolean) {
    setMatrix((cur) => {
      const next: Record<RoleId, Set<string>> = {
        all: new Set(cur.all),
        member: new Set(cur.member),
        manager: new Set(cur.manager),
        admin: new Set(cur.admin),
      }
      const set = next[roleId]
      if (checked) set.add(permissionId)
      else set.delete(permissionId)
      return next
    })
  }

  return (
    <AccountsPageContent
      organizationId={organizationId}
      currentUserId={currentUserId}
      organizations={organizations}
      headerActions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 text-white hover:bg-blue-700">
              <Shield className="mr-2 h-4 w-4" />
              Manage Role Permissions
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-4xl p-0">
            <DialogHeader className="space-y-1 border-b border-slate-200 px-6 py-5 text-left">
              <DialogTitle className="text-xl">Role permissions</DialogTitle>
              <DialogDescription>
                Manage what each role can do. Select a role and toggle permissions below.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 px-6 py-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="w-full sm:max-w-[260px]">
                  <Select value={activeRoleId} onValueChange={(v) => setActiveRoleId(v as RoleId)}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full sm:max-w-md">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search actions…" className="pl-9" />
                  </div>
                </div>
              </div>

              <div className="max-h-[520px] overflow-auto rounded-md border border-slate-200 bg-white">
                {groups.map(([category, rows]) => (
                  <div key={category} className="border-b border-slate-200 last:border-b-0">
                    <div className="flex items-center justify-between bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                      <span>{category}</span>
                      <span className="text-xs font-medium text-slate-500">
                        {ROLE_OPTIONS.find((r) => r.id === activeRoleId)?.label}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-200">
                      {rows.map((p) => {
                        const checked = matrix[activeRoleId].has(p.id)
                        return (
                          <div key={p.id} className="flex items-start justify-between gap-4 px-4 py-3 hover:bg-slate-50">
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-slate-900">{p.label}</div>
                              {p.description ? <div className="mt-0.5 text-xs text-slate-500">{p.description}</div> : null}
                            </div>
                            <input
                              type="checkbox"
                              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600"
                              checked={checked}
                              onChange={(e) => toggle(activeRoleId, p.id, e.target.checked)}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="border-t border-slate-200 px-6 py-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => setOpen(false)}>
                Save changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    />
  )
}


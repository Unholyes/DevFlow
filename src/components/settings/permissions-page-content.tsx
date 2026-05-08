'use client'

import { useEffect, useMemo, useState } from 'react'
import { Info, Plus, Search, Shield, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { canonicalBuiltinRoleKey, userCanManageOrganizationRoles } from '@/lib/permissions/can-manage-organization-roles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

type DefaultRole = 'Owner' | 'Admin' | 'Member'

type RoleKind = 'default' | 'custom'

type RoleListItem =
  | { kind: 'default'; role: DefaultRole; label: string }
  | { kind: 'custom'; id: string; label: string }

type PermissionCategory =
  | 'Account'
  | 'Project Management'
  | 'SDLC Management'
  | 'Development'
  | 'System'

type PermissionId =
  | 'account.users.invite'
  | 'account.users.remove'
  // Legacy alias (kept for backward compatibility; not shown in UI)
  | 'account.members.manage'
  | 'pm.projects.create'
  | 'pm.sprints.manage'
  | 'pm.phase_gates.approve'
  | 'pm.timelines.modify'
  | 'pm.db_schemas.manage'
  | 'pm.issues.assign_transition'
  | 'sdlc.sprints.create'
  | 'sdlc.backlog.manage'
  | 'projects.archive'
  | 'dev.repo.access'
  | 'dev.cicd.trigger'
  | 'dev.env.manage'
  | 'system.api_tokens.generate'
  | 'system.integrations.manage'

const CATEGORY_ORDER: PermissionCategory[] = ['Account', 'Project Management', 'SDLC Management', 'Development', 'System']

const PERMISSIONS: Array<{
  id: PermissionId
  category: PermissionCategory
  label: string
  description?: string
}> = [
  // Account
  { id: 'account.users.invite', category: 'Account', label: 'Invite users' },
  { id: 'account.users.remove', category: 'Account', label: 'Remove users' },

  // Project Management (hybrid SDLC perms)
  { id: 'pm.projects.create', category: 'Project Management', label: 'Create new project' },
  { id: 'pm.sprints.manage', category: 'Project Management', label: 'Manage sprint cycles' },
  { id: 'pm.phase_gates.approve', category: 'Project Management', label: 'Approve phase gate transitions' },
  { id: 'pm.timelines.modify', category: 'Project Management', label: 'Modify project timelines/Gantt charts' },
  { id: 'pm.db_schemas.manage', category: 'Project Management', label: 'Manage database schemas' },
  { id: 'pm.issues.assign_transition', category: 'Project Management', label: 'Assign and transition issue tickets' },

  // SDLC Management (the granular SDLC workflow perms you requested)
  { id: 'sdlc.sprints.create', category: 'SDLC Management', label: 'Create sprints' },
  { id: 'sdlc.backlog.manage', category: 'SDLC Management', label: 'Backlog management' },
  { id: 'projects.archive', category: 'SDLC Management', label: 'Archive projects' },

  // Development
  { id: 'dev.repo.access', category: 'Development', label: 'Repository access' },
  { id: 'dev.cicd.trigger', category: 'Development', label: 'Trigger CI/CD pipelines' },
  { id: 'dev.env.manage', category: 'Development', label: 'Manage environment variables' },

  // System
  { id: 'system.api_tokens.generate', category: 'System', label: 'Generate API tokens' },
  { id: 'system.integrations.manage', category: 'System', label: 'Integration setup' },
]

const DEFAULT_ROLES: Array<{ role: DefaultRole; label: string }> = [
  { role: 'Owner', label: 'Owner' },
  { role: 'Admin', label: 'Admin' },
  { role: 'Member', label: 'Member' },
]

function uniqueLower(values: string[]) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of values) {
    const k = v.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(v)
  }
  return out
}

function permissionListsEqual(a: string[], b: string[]) {
  const sa = uniqueLower([...a]).sort((x, y) => x.toLowerCase().localeCompare(y.toLowerCase()))
  const sb = uniqueLower([...b]).sort((x, y) => x.toLowerCase().localeCompare(y.toLowerCase()))
  if (sa.length !== sb.length) return false
  return sa.every((v, i) => v.toLowerCase() === sb[i].toLowerCase())
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((x) => typeof x === 'string') as string[]
}

function normalizePermissionsForUi(perms: unknown): string[] {
  const arr = uniqueLower(asStringArray(perms))
  // Expand legacy manage-members permission into the two new permissions for UI/display.
  if (arr.some((p) => p.toLowerCase() === 'account.members.manage')) {
    return uniqueLower([...arr, 'account.users.invite', 'account.users.remove'])
  }
  return arr
}

function groupByCategory() {
  const groups = new Map<PermissionCategory, typeof PERMISSIONS>()
  for (const p of PERMISSIONS) {
    const arr = groups.get(p.category) ?? []
    arr.push(p)
    groups.set(p.category, arr)
  }
  return groups
}

const PERMISSION_GROUPS = groupByCategory()
const ORDERED_PERMISSION_GROUPS: Array<[PermissionCategory, typeof PERMISSIONS]> = CATEGORY_ORDER.map((c) => {
  const perms = PERMISSION_GROUPS.get(c) ?? []
  return [c, perms] as [PermissionCategory, typeof PERMISSIONS]
}).filter((entry) => entry[1].length > 0)

export function PermissionsPageContent({
  organizationId,
  currentUserId,
  embedded = false,
}: {
  organizationId: string
  currentUserId: string
  embedded?: boolean
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentSystemRole, setCurrentSystemRole] = useState<'Owner' | 'Admin' | 'Member'>('Member')

  const [customRoles, setCustomRoles] = useState<Array<{ id: string; name: string; permissions: unknown }>>([])
  const [defaultRolePerms, setDefaultRolePerms] = useState<Record<DefaultRole, string[]>>({
    Owner: [],
    Admin: [],
    Member: [],
  })

  const [selected, setSelected] = useState<RoleListItem>({
    kind: 'default',
    role: 'Owner',
    label: 'Owner',
  })

  const [isNewRoleOpen, setIsNewRoleOpen] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newRolePerms, setNewRolePerms] = useState<PermissionId[]>([])
  const [newRolePermissionQuery, setNewRolePermissionQuery] = useState('')
  const [draftPermissions, setDraftPermissions] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null)

  const roleList = useMemo<RoleListItem[]>(() => {
    const defaults: RoleListItem[] = DEFAULT_ROLES.map((r) => ({ kind: 'default', role: r.role, label: r.label }))
    const customs: RoleListItem[] = customRoles.map((r) => ({ kind: 'custom', id: r.id, label: r.name }))
    return [...defaults, ...customs]
  }, [customRoles])

  const allPermissionIds = useMemo(() => PERMISSIONS.map((p) => p.id), [])

  const isOwnerSelected = useMemo(() => selected.kind === 'default' && selected.role === 'Owner', [selected])
  const isAdminSelected = useMemo(() => selected.kind === 'default' && selected.role === 'Admin', [selected])
  const canEditAdmin = currentSystemRole === 'Owner'
  const isReadOnlySelection = isOwnerSelected || (isAdminSelected && !canEditAdmin)

  /** Last-saved permissions for the currently selected role (source of truth from Supabase load). */
  const savedPermissionsForSelection = useMemo(() => {
    if (isOwnerSelected) return allPermissionIds
    if (selected.kind === 'default') return defaultRolePerms[selected.role]
    const role = customRoles.find((r) => r.id === selected.id)
    return normalizePermissionsForUi(role?.permissions ?? [])
  }, [allPermissionIds, customRoles, defaultRolePerms, isOwnerSelected, selected])

  const isDirty = !isReadOnlySelection && !permissionListsEqual(draftPermissions, savedPermissionsForSelection)

  useEffect(() => {
    setDraftPermissions(savedPermissionsForSelection)
  }, [savedPermissionsForSelection])

  const selectedTitle = useMemo(() => {
    const label = selected.label
    return `${label} permissions`
  }, [selected.label])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)
      setAccessDenied(false)
      try {
        const allowed = await userCanManageOrganizationRoles(supabase, currentUserId, organizationId)
        if (!allowed) {
          if (!cancelled) setAccessDenied(true)
          return
        }

        const [
          { data: memberRow, error: memberError },
          { data: defaults, error: defaultsError },
          { data: customs, error: customsError },
        ] = await Promise.all([
          supabase
            .from('organization_members')
            .select('system_role')
            .eq('organization_id', organizationId)
            .eq('user_id', currentUserId)
            .maybeSingle(),
          supabase
            .from('organization_default_roles')
            .select('role,permissions')
            .eq('organization_id', organizationId),
          supabase.from('organization_roles').select('id,name,permissions').eq('organization_id', organizationId).order('created_at', { ascending: true }),
        ])

        if (memberError) throw memberError
        if (defaultsError) throw defaultsError
        if (customsError) throw customsError

        const sys = String((memberRow as any)?.system_role ?? 'Member')
        const normalizedSystemRole: 'Owner' | 'Admin' | 'Member' = sys === 'Owner' ? 'Owner' : sys === 'Admin' ? 'Admin' : 'Member'

        const nextDefault: Record<DefaultRole, string[]> = { Owner: [], Admin: [], Member: [] }
        for (const row of defaults ?? []) {
          const canon = canonicalBuiltinRoleKey(String((row as { role?: unknown }).role ?? '')) as DefaultRole | null
          if (!canon) continue
          nextDefault[canon] = normalizePermissionsForUi((row as any).permissions)
        }

        if (!cancelled) {
          setCurrentSystemRole(normalizedSystemRole)
          setDefaultRolePerms(nextDefault)
          setCustomRoles((customs ?? []) as any)
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load permissions.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [organizationId, currentUserId])

  async function savePermissions() {
    if (isReadOnlySelection || !isDirty || isSaving) return
    setIsSaving(true)
    setError(null)
    try {
      const body =
        selected.kind === 'default'
          ? { target: 'default' as const, role: selected.role, permissions: draftPermissions }
          : { target: 'custom' as const, roleId: selected.id, permissions: draftPermissions }

      const res = await fetch(`/api/organizations/${encodeURIComponent(organizationId)}/role-permissions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'same-origin',
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof (payload as { error?: string }).error === 'string' ? (payload as { error: string }).error : 'Failed to save permissions.')
      }

      if (selected.kind === 'default') {
        setDefaultRolePerms((cur) => ({ ...cur, [selected.role]: uniqueLower(draftPermissions) }))
      } else {
        const next = uniqueLower(draftPermissions)
        setCustomRoles((cur) => cur.map((r) => (r.id === selected.id ? { ...r, permissions: next } : r)))
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save permissions.')
    } finally {
      setIsSaving(false)
    }
  }

  function togglePermission(id: PermissionId, checked: boolean) {
    if (isReadOnlySelection) return
    setDraftPermissions((cur) => {
      if (checked) return uniqueLower([...cur, id])
      return cur.filter((p) => p.toLowerCase() !== id.toLowerCase())
    })
  }

  async function createRole() {
    const name = newRoleName.trim().replace(/\s+/g, ' ')
    if (!name) {
      setError('Role name is required.')
      return
    }
    if (newRolePerms.length === 0) {
      setError('Select at least one permission.')
      return
    }

    const allNames = roleList.map((r) => r.label.toLowerCase())
    if (allNames.includes(name.toLowerCase())) {
      setError('That role already exists.')
      return
    }

    setIsCreating(true)
    setError(null)
    try {
      const { data, error: insertError } = await supabase
        .from('organization_roles')
        .insert({
          organization_id: organizationId,
          name,
          permissions: uniqueLower(newRolePerms),
        })
        .select('id,name,permissions')
        .single()

      if (insertError) throw insertError

      setCustomRoles((cur) => [...cur, data as any])
      setSelected({ kind: 'custom', id: data.id, label: data.name })
      setNewRoleName('')
      setNewRolePerms([])
      setIsNewRoleOpen(false)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create role.')
    } finally {
      setIsCreating(false)
    }
  }

  async function deleteRole(roleId: string) {
    if (deletingRoleId) return
    const role = customRoles.find((r) => r.id === roleId)
    const roleName = role?.name ?? 'this role'
    const ok = window.confirm(`Delete "${roleName}"? This cannot be undone.`)
    if (!ok) return

    setDeletingRoleId(roleId)
    setError(null)
    try {
      const { error: deleteError } = await supabase.from('organization_roles').delete().eq('organization_id', organizationId).eq('id', roleId)
      if (deleteError) throw deleteError

      setCustomRoles((cur) => cur.filter((r) => r.id !== roleId))
      setDraftPermissions((cur) => cur)
      setSelected((cur) => {
        if (cur.kind === 'custom' && cur.id === roleId) return { kind: 'default', role: 'Admin', label: 'Admin' }
        return cur
      })
    } catch (e: any) {
      setError(e?.message ?? 'Failed to delete role.')
    } finally {
      setDeletingRoleId(null)
    }
  }

  if (!isLoading && accessDenied) {
    return (
      <div className={embedded ? 'w-full' : 'mx-auto w-full max-w-6xl px-6 py-6'}>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className={embedded ? 'text-lg text-slate-900' : 'text-xl text-slate-900'}>
              {embedded ? 'Roles & permissions' : 'Permissions'}
            </CardTitle>
            <CardDescription>
              Manage default roles, custom roles, and the &quot;Manage members&quot; capability for this workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-amber-200 bg-amber-50/80 px-6 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <Shield className="h-6 w-6 text-amber-800" />
              </div>
              <p className="mt-4 text-base font-semibold text-slate-900">Access restricted</p>
              <p className="mt-2 max-w-md text-sm text-slate-600">
                You need the <span className="font-medium">Invite users</span> or <span className="font-medium">Remove users</span> permission (or the Owner/Admin workspace role) to change role definitions. Ask an administrator if you need access.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={embedded ? 'w-full' : 'mx-auto w-full max-w-6xl px-6 py-6'}>
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className={embedded ? 'text-lg font-semibold text-slate-900' : 'text-2xl font-semibold text-slate-900'}>
            {embedded ? 'Roles & permissions' : 'Permissions'}
          </h1>
          <p className={embedded ? 'mt-1 text-sm text-slate-500' : 'mt-1 text-sm text-slate-500'}>
            {embedded
              ? 'Manage default roles and custom roles for this workspace.'
              : 'Define the default account-level permissions for your users.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {embedded ? null : (
            <>
              <a href="#" className="text-sm text-slate-500 hover:text-slate-700">
                Documentation
              </a>
              <a href="#" className="text-sm text-slate-500 hover:text-slate-700">
                Feedback
              </a>
            </>
          )}

          <Dialog open={isNewRoleOpen} onOpenChange={setIsNewRoleOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-9 rounded-md">
                <Plus className="mr-2 h-4 w-4" />
                New role
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl p-0">
              <DialogHeader className="space-y-1 border-b border-slate-200 px-6 py-5 text-left">
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0">
                    <DialogTitle className="text-xl">Create custom role</DialogTitle>
                    <DialogDescription className="mt-1">
                      Define a role name and select the permissions you want this custom role to have.
                    </DialogDescription>
                  </div>
                  <div className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {newRolePerms.length} selected
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 px-6 py-5">
                <div>
                  <label className="text-sm font-medium text-slate-700">Role name</label>
                  <Input
                    className="mt-1"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="e.g. Resource Manager"
                    disabled={isCreating}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-4">
                    <label className="text-sm font-medium text-slate-700">Permissions</label>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900"
                      disabled={isCreating || newRolePerms.length === 0}
                      onClick={() => setNewRolePerms([])}
                    >
                      Clear selection
                    </Button>
                  </div>

                  <div className="mt-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={newRolePermissionQuery}
                        onChange={(e) => setNewRolePermissionQuery(e.target.value)}
                        placeholder="Search permissions…"
                        className="pl-9"
                        disabled={isCreating}
                      />
                    </div>

                    <div className="mt-3 max-h-[420px] overflow-auto rounded-md border border-slate-200 bg-white">
                      {ORDERED_PERMISSION_GROUPS.map(([category, perms]) => {
                        const q = newRolePermissionQuery.trim().toLowerCase()
                        const visiblePerms = q ? perms.filter((p) => p.label.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)) : perms
                        if (visiblePerms.length === 0) return null

                        const visibleIds = visiblePerms.map((p) => p.id)
                        const selectedVisibleCount = visibleIds.filter((id) => newRolePerms.includes(id)).length
                        const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length

                        return (
                          <div key={category} className="border-b border-slate-200 last:border-b-0">
                            <div className="flex items-center justify-between gap-3 bg-white px-4 py-3">
                              <div className="text-sm font-semibold text-slate-700">{category}</div>
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900"
                                disabled={isCreating}
                                onClick={() => {
                                  setNewRolePerms((cur) => {
                                    if (allVisibleSelected) return cur.filter((x) => !visibleIds.includes(x))
                                    return uniqueLower([...cur, ...visibleIds]) as PermissionId[]
                                  })
                                }}
                              >
                                {allVisibleSelected ? 'Unselect all' : 'Select all'}
                              </Button>
                            </div>

                            <div className="divide-y divide-slate-200">
                              {visiblePerms.map((p) => {
                                const checked = newRolePerms.includes(p.id)
                                return (
                                  <label key={p.id} className="flex items-start gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50">
                                    <input
                                      type="checkbox"
                                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
                                      checked={checked}
                                      onChange={(e) => {
                                        setNewRolePerms((cur) => (e.target.checked ? (uniqueLower([...cur, p.id]) as PermissionId[]) : cur.filter((x) => x !== p.id)))
                                      }}
                                      disabled={isCreating}
                                    />
                                    <span className="min-w-0">
                                      <span className="block font-medium text-slate-900">{p.label}</span>
                                      <span className="block text-xs text-slate-500">{p.id}</span>
                                    </span>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t border-slate-200 px-6 py-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsNewRoleOpen(false)
                    setNewRoleName('')
                    setNewRolePerms([])
                    setNewRolePermissionQuery('')
                  }}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void createRole()}
                  className="bg-[#7a2233] text-white hover:bg-[#651c2a]"
                  disabled={isCreating}
                >
                  Create role
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-0 rounded-lg border border-slate-200 bg-white md:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <div className="border-b border-slate-200 p-4 md:border-b-0 md:border-r">
          <div className="text-xs font-semibold text-slate-600">Default account roles</div>
          <div className="mt-3 space-y-1">
            {DEFAULT_ROLES.map((r) => {
              const isActive = selected.kind === 'default' && selected.role === r.role
              return (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => setSelected({ kind: 'default', role: r.role, label: r.label })}
                  className={[
                    'w-full rounded-md px-3 py-2 text-left text-sm',
                    isActive ? 'bg-blue-50 text-slate-900' : 'text-slate-700 hover:bg-slate-50',
                  ].join(' ')}
                >
                  {r.label}
                </button>
              )
            })}
          </div>

          <div className="mt-6 text-xs font-semibold text-slate-600">Custom account roles</div>
          <div className="mt-2 text-xs text-slate-500">
            These roles are based on the default roles. <span className="text-blue-600">Read more</span>
          </div>
          <div className="mt-3 space-y-1">
            {customRoles.length === 0 ? (
              <div className="rounded-md px-3 py-2 text-sm text-slate-500">No custom roles yet.</div>
            ) : (
              customRoles.map((r) => {
                const isActive = selected.kind === 'custom' && selected.id === r.id
                return (
                  <div
                    key={r.id}
                    className={[
                      'flex w-full items-center gap-2 rounded-md px-1 py-1',
                      isActive ? 'bg-blue-50' : 'hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <button
                      type="button"
                      onClick={() => setSelected({ kind: 'custom', id: r.id, label: r.name })}
                      className={['min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm', isActive ? 'text-slate-900' : 'text-slate-700'].join(' ')}
                    >
                      {r.name}
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete role ${r.name}`}
                      title="Delete role"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        void deleteRole(r.id)
                      }}
                      disabled={isLoading || deletingRoleId === r.id}
                      className={[
                        'inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-slate-500',
                        'hover:bg-white hover:text-red-600',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                      ].join(' ')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Main */}
        <div className="p-4 md:p-6">
          <div className="text-base font-semibold text-slate-900">{selectedTitle}</div>
          <div className="mt-4 max-h-[520px] overflow-auto rounded-md border border-slate-200">
            {ORDERED_PERMISSION_GROUPS.map(([category, perms]) => (
              <div key={category} className="border-b border-slate-200 last:border-b-0">
                <div className="bg-white px-4 py-3 text-sm font-semibold text-slate-700">{category}</div>
                <div className="divide-y divide-slate-200">
                  {perms.map((p) => {
                    const checked = draftPermissions.some((x) => x.toLowerCase() === p.id.toLowerCase())
                    const isInviteUsers = p.id === 'account.users.invite'
                    const isRemoveUsers = p.id === 'account.users.remove'
                    return (
                      <label key={p.id} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-blue-600"
                          checked={checked}
                          onChange={(e) => togglePermission(p.id, e.target.checked)}
                          disabled={isLoading || isReadOnlySelection}
                        />
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate">{p.label}</span>
                          {isInviteUsers || isRemoveUsers ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 hover:text-slate-600"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                    }}
                                    aria-label={`What does ${p.label} do?`}
                                  >
                                    <Info className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                  {isInviteUsers
                                    ? 'Allows inviting users to this workspace.'
                                    : 'Allows removing workspace members, but only if the target member has a lower role level.'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : null}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            {isOwnerSelected ? (
              <p className="text-sm text-slate-500">The Owner role always includes every permission.</p>
            ) : isAdminSelected && !canEditAdmin ? (
              <p className="text-sm text-slate-500">Only Owners can edit Admin permissions.</p>
            ) : isDirty ? (
              <p className="text-sm text-amber-800">You have unsaved changes for this role.</p>
            ) : (
              <p className="text-sm text-slate-500">Click Save to persist changes to the database.</p>
            )}
            {!isReadOnlySelection ? (
              <Button
                type="button"
                className="bg-[#7a2233] text-white hover:bg-[#651c2a]"
                disabled={isLoading || !isDirty || isSaving}
                onClick={() => void savePermissions()}
              >
                {isSaving ? 'Saving…' : 'Save changes'}
              </Button>
            ) : null}
          </div>

          {isLoading ? <div className="mt-3 text-sm text-slate-500">Loading…</div> : null}
        </div>
      </div>
    </div>
  )
}


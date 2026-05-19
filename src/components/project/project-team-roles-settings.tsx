'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, RotateCcw, Shield, Trash2 } from 'lucide-react'
import {
  ORDERED_PROJECT_TEMPLATE_GROUPS,
  filterToProjectTemplatePermissions,
  isProjectTemplatePermissionId,
  type ProjectTemplatePermissionId,
} from '@/lib/permissions/project-template-permissions'
import type { ProjectTeamRoleWithOrg } from '@/lib/permissions/team-roles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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

function roleBadge(role: ProjectTeamRoleWithOrg) {
  if (!role.organization_team_role_id) return 'Project only'
  if (role.inherits_from_org) return 'Workspace default'
  return 'Customized'
}

export function ProjectTeamRolesSettings({
  projectId,
  canEdit,
}: {
  projectId: string
  canEdit: boolean
}) {
  const [roles, setRoles] = useState<ProjectTeamRoleWithOrg[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draftPermissions, setDraftPermissions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPermissions, setNewPermissions] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const selected = useMemo(() => roles.find((r) => r.id === selectedId) ?? null, [roles, selectedId])
  const savedEffective = selected?.effectivePermissions ?? []

  const isDirty = useMemo(
    () => selected && !permissionListsEqual(draftPermissions, savedEffective),
    [draftPermissions, savedEffective, selected],
  )

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/team-roles`, {
        credentials: 'same-origin',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof json.error === 'string' ? json.error : 'Failed to load team roles')
      const list = Array.isArray(json.roles) ? (json.roles as ProjectTeamRoleWithOrg[]) : []
      setRoles(list)
      setSelectedId((cur) => cur ?? list[0]?.id ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load team roles')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!selected) return
    setDraftPermissions(selected.effectivePermissions)
  }, [selected])

  function togglePermission(id: ProjectTemplatePermissionId, checked: boolean, target: 'draft' | 'new') {
    const setter = target === 'new' ? setNewPermissions : setDraftPermissions
    if (!isProjectTemplatePermissionId(id)) return
    setter((cur) => {
      if (checked) return uniqueLower([...cur, id])
      return cur.filter((p) => p.toLowerCase() !== id.toLowerCase())
    })
  }

  async function save() {
    if (!selected || !canEdit || !isDirty || isSaving) return
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/team-roles`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'update',
          roleId: selected.id,
          permissions: filterToProjectTemplatePermissions(draftPermissions),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof json.error === 'string' ? json.error : 'Failed to save')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  async function resetToWorkspace() {
    if (!selected?.organization_team_role_id || !canEdit || isResetting) return
    setIsResetting(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/team-roles`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'reset', roleId: selected.id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof json.error === 'string' ? json.error : 'Failed to reset')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reset')
    } finally {
      setIsResetting(false)
    }
  }

  async function createRole() {
    const name = newName.trim()
    if (!name || isCreating) return
    setIsCreating(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/team-roles`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          action: 'create',
          name,
          permissions: filterToProjectTemplatePermissions(newPermissions),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof json.error === 'string' ? json.error : 'Failed to create role')
      setIsCreateOpen(false)
      setNewName('')
      setNewPermissions([])
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create role')
    } finally {
      setIsCreating(false)
    }
  }

  async function deleteRole(roleId: string) {
    if (!canEdit || deletingId) return
    const role = roles.find((r) => r.id === roleId)
    const message = role?.organization_team_role_id
      ? `Remove "${role?.name ?? 'this role'}" from this project? The workspace role stays available under Accounts → Team roles and on other projects.`
      : `Delete project-only team role "${role?.name ?? 'this role'}"?`
    if (!window.confirm(message)) return
    setDeletingId(roleId)
    setError(null)
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/team-roles?roleId=${encodeURIComponent(roleId)}`,
        { method: 'DELETE', credentials: 'same-origin' },
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof json.error === 'string' ? json.error : 'Failed to delete')
      setSelectedId((cur) => (cur === roleId ? null : cur))
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  if (!canEdit) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle>Team roles</CardTitle>
          <CardDescription>Delivery roles and permissions for this project.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-amber-200 bg-amber-50/80 px-6 py-10 text-center">
            <Shield className="h-8 w-8 text-amber-800" />
            <p className="mt-4 font-semibold text-slate-900">Access restricted</p>
            <p className="mt-2 text-sm text-slate-600">You need permission to manage this project team.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Team roles</CardTitle>
          <CardDescription>
            Roles inherited from the workspace can be customized for this project. Project-only roles apply here only.
          </CardDescription>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New project role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create project-only role</DialogTitle>
              <DialogDescription>This role exists only on this project, not workspace-wide.</DialogDescription>
            </DialogHeader>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Role name" />
            <div className="max-h-48 overflow-auto rounded border border-slate-200 p-2">
              {ORDERED_PROJECT_TEMPLATE_GROUPS.map(([category, perms]) => (
                <div key={category} className="mb-2">
                  <p className="text-xs font-semibold text-slate-600">{category}</p>
                  {perms.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 py-1 text-sm">
                      <input
                        type="checkbox"
                        checked={newPermissions.some((x) => x.toLowerCase() === p.id.toLowerCase())}
                        onChange={(e) => togglePermission(p.id, e.target.checked, 'new')}
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={() => void createRole()} disabled={isCreating || !newName.trim()}>
                {isCreating ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <div className="space-y-1">
            {roles.map((role) => (
              <div key={role.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedId(role.id)}
                  className={[
                    'min-w-0 flex-1 rounded-md px-3 py-2 text-left text-sm',
                    selectedId === role.id ? 'bg-blue-50' : 'hover:bg-slate-50',
                  ].join(' ')}
                >
                  <span className="block font-medium">{role.name}</span>
                  <span className="text-xs text-slate-500">{roleBadge(role)}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${role.name}`}
                  className="rounded p-2 text-slate-500 hover:text-red-600"
                  disabled={deletingId === role.id}
                  onClick={() => void deleteRole(role.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          {selected ? (
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {roleBadge(selected)}
                </span>
                {selected.organization_team_role_id && !selected.inherits_from_org ? (
                  <Button type="button" variant="outline" size="sm" disabled={isResetting} onClick={() => void resetToWorkspace()}>
                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                    Reset to workspace
                  </Button>
                ) : null}
              </div>
              <div className="max-h-[420px] overflow-auto rounded border border-slate-200">
                {ORDERED_PROJECT_TEMPLATE_GROUPS.map(([category, perms]) => (
                  <div key={category}>
                    <div className="bg-slate-50 px-3 py-2 text-sm font-semibold">{category}</div>
                    {perms.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 border-t px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={draftPermissions.some((x) => x.toLowerCase() === p.id.toLowerCase())}
                          onChange={(e) => togglePermission(p.id, e.target.checked, 'draft')}
                          disabled={isLoading}
                        />
                        {p.label}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  className="bg-[#7a2233] text-white hover:bg-[#651c2a]"
                  disabled={!isDirty || isSaving}
                  onClick={() => void save()}
                >
                  {isSaving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
        {isLoading ? <p className="mt-2 text-sm text-slate-500">Loading…</p> : null}
      </CardContent>
    </Card>
  )
}

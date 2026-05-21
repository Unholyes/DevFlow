'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Shield, Trash2 } from 'lucide-react'
import {
  ORDERED_PROJECT_TEMPLATE_GROUPS,
  filterToProjectTemplatePermissions,
  isProjectTemplatePermissionId,
  type ProjectTemplatePermissionId,
} from '@/lib/permissions/project-template-permissions'
import type { OrganizationTeamRoleRow } from '@/lib/permissions/team-roles'
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

export function OrganizationTeamRolesSettings({
  organizationId,
  canEdit,
}: {
  organizationId: string
  canEdit: boolean
}) {
  const [roles, setRoles] = useState<OrganizationTeamRoleRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draftPermissions, setDraftPermissions] = useState<string[]>([])
  const [draftName, setDraftName] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newPermissions, setNewPermissions] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const selected = useMemo(() => roles.find((r) => r.id === selectedId) ?? null, [roles, selectedId])

  const isDirty = useMemo(() => {
    if (!selected) return false
    return (
      !permissionListsEqual(draftPermissions, selected.permissions) ||
      draftName.trim() !== selected.name ||
      (draftDescription.trim() || '') !== (selected.description ?? '')
    )
  }, [draftDescription, draftName, draftPermissions, selected])

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/organizations/${encodeURIComponent(organizationId)}/team-roles`, {
        credentials: 'same-origin',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof json.error === 'string' ? json.error : 'Failed to load team roles')
      const list = Array.isArray(json.roles) ? (json.roles as OrganizationTeamRoleRow[]) : []
      setRoles(list)
      setSelectedId((cur) => cur ?? list[0]?.id ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load team roles')
    } finally {
      setIsLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!selected) return
    setDraftPermissions(selected.permissions)
    setDraftName(selected.name)
    setDraftDescription(selected.description ?? '')
  }, [selected])

  function togglePermission(id: ProjectTemplatePermissionId, checked: boolean, target: 'draft' | 'new') {
    const setter = target === 'new' ? setNewPermissions : setDraftPermissions
    if (!isProjectTemplatePermissionId(id)) return
    setter((cur) => {
      if (checked) return uniqueLower([...cur, id])
      return cur.filter((p) => p.toLowerCase() !== id.toLowerCase())
    })
  }

  async function saveSelected() {
    if (!selected || !canEdit || !isDirty || isSaving) return
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/organizations/${encodeURIComponent(organizationId)}/team-roles`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          roleId: selected.id,
          name: draftName.trim(),
          description: draftDescription.trim(),
          permissions: filterToProjectTemplatePermissions(draftPermissions),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof json.error === 'string' ? json.error : 'Failed to save')
      const role = json.role as OrganizationTeamRoleRow
      setRoles((cur) => cur.map((r) => (r.id === role.id ? role : r)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  async function createRole() {
    const name = newName.trim()
    if (!name || isCreating) return
    setIsCreating(true)
    setError(null)
    try {
      const res = await fetch(`/api/organizations/${encodeURIComponent(organizationId)}/team-roles`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name,
          description: newDescription.trim(),
          permissions: filterToProjectTemplatePermissions(newPermissions),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof json.error === 'string' ? json.error : 'Failed to create role')
      const role = json.role as OrganizationTeamRoleRow
      setRoles((cur) => [...cur, role].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedId(role.id)
      setIsCreateOpen(false)
      setNewName('')
      setNewDescription('')
      setNewPermissions([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create role')
    } finally {
      setIsCreating(false)
    }
  }

  async function deleteRole(roleId: string) {
    if (!canEdit || deletingId) return
    const role = roles.find((r) => r.id === roleId)
    if (!window.confirm(`Delete workspace team role "${role?.name ?? 'this role'}"? This removes it from all projects.`)) {
      return
    }
    setDeletingId(roleId)
    setError(null)
    try {
      const res = await fetch(
        `/api/organizations/${encodeURIComponent(organizationId)}/team-roles?roleId=${encodeURIComponent(roleId)}`,
        { method: 'DELETE', credentials: 'same-origin' },
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof json.error === 'string' ? json.error : 'Failed to delete')
      setRoles((cur) => cur.filter((r) => r.id !== roleId))
      setSelectedId((cur) => (cur === roleId ? null : cur))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  if (!canEdit) {
    return (
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Team roles</CardTitle>
          <CardDescription>Default delivery roles for all projects in this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-amber-200 bg-amber-50/80 px-6 py-10 text-center">
            <Shield className="h-8 w-8 text-amber-800" />
            <p className="mt-4 font-semibold text-foreground">Access restricted</p>
            <p className="mt-2 text-sm text-muted-foreground">You need permission to manage workspace roles.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Team roles</CardTitle>
          <CardDescription>
            Workspace defaults for project delivery roles. New projects inherit these; each project can customize
            permissions separately.
          </CardDescription>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create workspace team role</DialogTitle>
              <DialogDescription>This role will be added to every project in the workspace.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input className="mt-1" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="max-h-48 overflow-auto rounded border border-border p-2">
                {ORDERED_PROJECT_TEMPLATE_GROUPS.map(([category, perms]) => (
                  <div key={category} className="mb-2">
                    <p className="text-xs font-semibold text-muted-foreground">{category}</p>
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
        {roles.length === 0 && !isLoading ? (
          <p className="text-sm text-muted-foreground">No team roles yet. Create one to get started.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-[220px_1fr]">
            <div className="space-y-1">
              {roles.map((role) => (
                <div key={role.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedId(role.id)}
                    className={[
                      'min-w-0 flex-1 rounded-md px-3 py-2 text-left text-sm',
                      selectedId === role.id ? 'bg-accent text-foreground' : 'hover:bg-muted',
                    ].join(' ')}
                  >
                    {role.name}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${role.name}`}
                    className="rounded p-2 text-muted-foreground hover:text-red-600"
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
                <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} className="mb-2" />
                <Input
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="mb-4"
                />
                <div className="max-h-[400px] overflow-auto rounded border border-border">
                  {ORDERED_PROJECT_TEMPLATE_GROUPS.map(([category, perms]) => (
                    <div key={category}>
                      <div className="bg-muted px-3 py-2 text-sm font-semibold">{category}</div>
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
                    onClick={() => void saveSelected()}
                  >
                    {isSaving ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
        {isLoading ? <p className="mt-2 text-sm text-muted-foreground">Loading…</p> : null}
      </CardContent>
    </Card>
  )
}

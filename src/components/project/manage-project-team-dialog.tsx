'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  PROJECT_ACCESS_LEVELS,
  PROJECT_FUNCTIONAL_ROLES,
  getProjectTemplatePermissionLabel,
  type ProjectAccessLevel,
} from '@/lib/permissions/project-template-permissions'
import { cn } from '@/lib/utils'
import { ChevronDown, Info, Loader2, Search, Users, User, UsersRound, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useId, useMemo, useState } from 'react'

type AssigneeKind = 'user' | 'team'

type AssigneeOption = {
  kind: AssigneeKind
  id: string
  label: string
  subtitle?: string
}

function FieldLabel({
  children,
  required,
  htmlFor,
  className,
}: {
  children: React.ReactNode
  required?: boolean
  htmlFor?: string
  className?: string
}) {
  return (
    <Label
      htmlFor={htmlFor}
      className={cn('mb-1.5 block text-xs font-semibold text-gray-700', className)}
    >
      {required ? <span className="text-red-500">* </span> : null}
      {children}
    </Label>
  )
}

function InfoHint({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="ml-1 inline-flex text-gray-400 hover:text-gray-600"
          aria-label={text}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

function parseAccessLevel(value: string): ProjectAccessLevel {
  if (value === 'Admin' || value === 'Editor' || value === 'Viewer') return value
  return 'Editor'
}

export function ManageProjectTeamDialog({
  projectId,
  projectName,
  organizationId,
}: {
  projectId: string
  projectName: string
  organizationId: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [assignee, setAssignee] = useState<AssigneeOption | null>(null)
  const [accessLevel, setAccessLevel] = useState<ProjectAccessLevel>('Editor')
  const [functionalRole, setFunctionalRole] = useState<string>('project_manager')
  const [assigneeOptions, setAssigneeOptions] = useState<AssigneeOption[]>([])
  const [projectTemplatePermissions, setProjectTemplatePermissions] = useState<
    Record<ProjectAccessLevel, string[]>
  >({ Admin: [], Editor: [], Viewer: [] })
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const baseId = useId()

  const resetForm = useCallback(() => {
    setAssignee(null)
    setSearch('')
    setPickerOpen(false)
    setAccessLevel('Editor')
    setFunctionalRole('project_manager')
    setSaveError(null)
  }, [])

  const loadAssignees = useCallback(async () => {
    setIsLoadingOptions(true)
    setLoadError(null)
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/members`, {
        credentials: 'same-origin',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof json.error === 'string' ? json.error : 'Failed to load assignees')
      }
      const list = Array.isArray(json.assignees) ? (json.assignees as AssigneeOption[]) : []
      setAssigneeOptions(list)
      if (json.projectTemplatePermissions && typeof json.projectTemplatePermissions === 'object') {
        setProjectTemplatePermissions(json.projectTemplatePermissions as Record<ProjectAccessLevel, string[]>)
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load organization users and teams')
      setAssigneeOptions([])
    } finally {
      setIsLoadingOptions(false)
    }
  }, [projectId])

  useEffect(() => {
    if (!open) return
    void loadAssignees()
  }, [open, loadAssignees])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return assigneeOptions
    return assigneeOptions.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.subtitle && o.subtitle.toLowerCase().includes(q)) ||
        o.kind.toLowerCase().includes(q),
    )
  }, [assigneeOptions, search])

  const effectivePermissions = useMemo(
    () => projectTemplatePermissions[accessLevel] ?? [],
    [accessLevel, projectTemplatePermissions],
  )

  const canSave = Boolean(assignee) && !isSaving && !isLoadingOptions

  const handleSave = async (andNew: boolean) => {
    if (!assignee) {
      setSaveError('Select a user or team to assign')
      return
    }

    setIsSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          kind: assignee.kind,
          assigneeId: assignee.id,
          project_access_level: accessLevel,
          functional_role: functionalRole,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof json.error === 'string' ? json.error : 'Failed to save assignment')
      }

      router.refresh()

      if (andNew) {
        resetForm()
        void loadAssignees()
      } else {
        setOpen(false)
        resetForm()
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save assignment')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) resetForm()
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" type="button">
            <Users className="mr-2 h-4 w-4" />
            Manage Team
          </Button>
        </DialogTrigger>
        <DialogContent
          className={cn(
            'flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden p-0',
            'sm:max-w-lg',
          )}
        >
          <DialogHeader className="shrink-0 border-b border-gray-100 px-6 pb-4 pt-6 text-center">
            <DialogTitle className="text-lg font-semibold text-gray-900">Assign Team Member</DialogTitle>
          </DialogHeader>

          <div className="flex shrink-0 items-center justify-end border-b border-gray-50 px-6 py-2">
            <p className="text-xs text-gray-500">
              <span className="font-medium text-red-500">*</span> = Required
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-6">
              <section className="space-y-4">
                <div className="-mx-6 border-y border-gray-200 bg-gray-100 px-6 py-2 text-sm font-semibold text-gray-800">
                  Assignment
                </div>

                <div>
                  <FieldLabel required htmlFor={`${baseId}-project`}>
                    Project
                  </FieldLabel>
                  <Input
                    id={`${baseId}-project`}
                    readOnly
                    value={projectName}
                    className="h-9 cursor-default bg-gray-50 text-gray-900"
                    title={projectId}
                  />
                </div>

                <div>
                  <FieldLabel required>User or team</FieldLabel>
                  <InfoHint text="Organization members and workspace teams. Assigning a team adds each team member to this project with the access level and functional role below." />
                  {loadError ? <p className="mt-1 text-sm text-red-600">{loadError}</p> : null}
                  <div className="relative mt-1">
                    <button
                      type="button"
                      id={`${baseId}-assignee`}
                      className={cn(
                        'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-left text-sm',
                        !assignee && 'text-muted-foreground',
                        isLoadingOptions && 'opacity-60',
                      )}
                      onClick={() => !isLoadingOptions && setPickerOpen((v) => !v)}
                      disabled={isLoadingOptions}
                      aria-expanded={pickerOpen}
                      aria-haspopup="listbox"
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        {isLoadingOptions ? (
                          <>
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-400" />
                            <span>Loading…</span>
                          </>
                        ) : assignee ? (
                          <>
                            {assignee.kind === 'user' ? (
                              <User className="h-4 w-4 shrink-0 text-gray-500" />
                            ) : (
                              <UsersRound className="h-4 w-4 shrink-0 text-gray-500" />
                            )}
                            <span className="truncate text-gray-900">{assignee.label}</span>
                          </>
                        ) : (
                          <span>Select user or team…</span>
                        )}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </button>
                    {assignee ? (
                      <button
                        type="button"
                        className="absolute right-9 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        aria-label="Clear selection"
                        onClick={(e) => {
                          e.stopPropagation()
                          setAssignee(null)
                          setSearch('')
                        }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>

                  {pickerOpen ? (
                    <div className="mt-1 w-full rounded-md border border-gray-200 bg-white shadow-md">
                      <div className="relative border-b border-gray-100 p-2">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          className="h-8 pl-9 pr-2 text-sm"
                          placeholder="Search users or teams…"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <ul className="max-h-52 overflow-auto py-1" role="listbox">
                        {filtered.length === 0 ? (
                          <li className="px-3 py-2 text-sm text-gray-500">
                            {isLoadingOptions ? 'Loading…' : 'No matches.'}
                          </li>
                        ) : (
                          filtered.map((opt) => (
                            <li key={`${opt.kind}-${opt.id}`}>
                              <button
                                type="button"
                                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                                onClick={() => {
                                  setAssignee(opt)
                                  setPickerOpen(false)
                                  setSearch('')
                                }}
                              >
                                {opt.kind === 'user' ? (
                                  <User className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                                ) : (
                                  <UsersRound className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                                )}
                                <span className="min-w-0">
                                  <span className="block font-medium text-gray-900">{opt.label}</span>
                                  {opt.subtitle ? (
                                    <span className="block text-xs text-gray-500">{opt.subtitle}</span>
                                  ) : null}
                                  <span className="mt-0.5 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-600">
                                    {opt.kind}
                                  </span>
                                </span>
                              </button>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="space-y-4">
                <div className="-mx-6 border-y border-gray-200 bg-gray-100 px-6 py-2 text-sm font-semibold text-gray-800">
                  Access &amp; role
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel className="inline-flex items-center" htmlFor={`${baseId}-access`}>
                      Project access level
                      <InfoHint text="Uses the org template (Admin / Editor / Viewer) configured under Settings → Permissions. This controls project-scoped permissions." />
                    </FieldLabel>
                    <Select value={accessLevel} onValueChange={(v) => setAccessLevel(parseAccessLevel(v))}>
                      <SelectTrigger id={`${baseId}-access`} className="h-9">
                        <SelectValue placeholder="Access level" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_ACCESS_LEVELS.map((lvl) => (
                          <SelectItem key={lvl} value={lvl}>
                            {lvl}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel className="inline-flex items-center" htmlFor={`${baseId}-functional`}>
                      Functional role
                      <InfoHint text="Descriptive tag only (e.g. QA Engineer). Does not grant permissions; use project access level for that." />
                    </FieldLabel>
                    <Select value={functionalRole} onValueChange={setFunctionalRole}>
                      <SelectTrigger id={`${baseId}-functional`} className="h-9">
                        <SelectValue placeholder="Functional role" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_FUNCTIONAL_ROLES.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="rounded-md border border-blue-100 bg-blue-50/50 px-3 py-3">
                  <p className="text-xs font-semibold text-blue-900">
                    Permissions from <span className="font-medium">{accessLevel}</span> template
                  </p>
                  {effectivePermissions.length === 0 ? (
                    <p className="mt-1 text-xs text-blue-800">No project-scoped permissions (read-only).</p>
                  ) : (
                    <ul className="mt-2 max-h-28 space-y-1 overflow-auto text-xs text-blue-900">
                      {effectivePermissions.map((perm) => (
                        <li key={perm} className="list-inside list-disc">
                          {getProjectTemplatePermissionLabel(perm)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              {saveError ? <p className="text-sm text-red-600">{saveError}</p> : null}
            </div>
          </div>

          <div
            role="group"
            className="flex shrink-0 flex-row flex-wrap items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4"
          >
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canSave}
              onClick={() => void handleSave(true)}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save & New'
              )}
            </Button>
            <Button type="button" disabled={!canSave} onClick={() => void handleSave(false)}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}

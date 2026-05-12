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
  FUNCTIONAL_ROLE_OPTIONS,
  PROJECT_ACCESS_LEVELS,
} from '@/lib/permissions/project-access-level'
import { cn } from '@/lib/utils'
import { ChevronDown, Info, Search, Users, User, UsersRound, X } from 'lucide-react'
import { useId, useMemo, useState } from 'react'

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

/** Placeholder directory until wired to Supabase (`profiles`, `teams`). */
function useMockAssignees(organizationId: string | undefined): AssigneeOption[] {
  return useMemo(
    () => [
      { kind: 'user', id: 'user-1', label: 'Karen Guanzon', subtitle: 'karen@example.com' },
      { kind: 'user', id: 'user-2', label: 'Alex Rivera', subtitle: 'alex@example.com' },
      { kind: 'user', id: 'user-3', label: 'Sam Patel', subtitle: 'sam@example.com' },
      { kind: 'team', id: 'team-1', label: 'Platform Team', subtitle: organizationId ? 'Workspace team' : 'Team' },
      { kind: 'team', id: 'team-2', label: 'QA Guild', subtitle: 'Workspace team' },
      { kind: 'team', id: 'team-3', label: 'Mobile Squad', subtitle: 'Workspace team' },
    ],
    [organizationId],
  )
}

export function ManageProjectTeamDialog({
  projectId,
  projectName,
  organizationId,
}: {
  projectId: string
  projectName: string
  /** Used when wiring search to org members / teams */
  organizationId?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [assignee, setAssignee] = useState<AssigneeOption | null>(null)
  const [accessLevel, setAccessLevel] = useState<string>('Editor')
  const [functionalRole, setFunctionalRole] = useState<string>('project_manager')
  const baseId = useId()

  const allOptions = useMockAssignees(organizationId)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allOptions
    return allOptions.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.subtitle && o.subtitle.toLowerCase().includes(q)) ||
        o.kind.toLowerCase().includes(q),
    )
  }, [allOptions, search])

  return (
    <TooltipProvider delayDuration={200}>
      <Dialog open={open} onOpenChange={setOpen}>
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
                  <InfoHint text="Search organization members and teams. Saving assignments will be wired to the database in a follow-up." />
                  <div className="relative mt-1">
                    <button
                      type="button"
                      id={`${baseId}-assignee`}
                      className={cn(
                        'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-left text-sm',
                        !assignee && 'text-muted-foreground',
                      )}
                      onClick={() => setPickerOpen((v) => !v)}
                      aria-expanded={pickerOpen}
                      aria-haspopup="listbox"
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        {assignee ? (
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
                      <ul className="max-h-52 overflow-auto py-1">
                        {filtered.length === 0 ? (
                          <li className="px-3 py-2 text-sm text-gray-500">No matches.</li>
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
                      <InfoHint text="Controls project-scoped permissions (sprints, gates, repo access, etc.). One level per person per project. Independent of workspace Owner/Admin/Member." />
                    </FieldLabel>
                    <Select value={accessLevel} onValueChange={setAccessLevel}>
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
                      <InfoHint text="Descriptive tag only (e.g. QA). Does not grant permissions by itself and does not replace workspace system roles." />
                    </FieldLabel>
                    <Select value={functionalRole} onValueChange={setFunctionalRole}>
                      <SelectTrigger id={`${baseId}-functional`} className="h-9">
                        <SelectValue placeholder="Functional role" />
                      </SelectTrigger>
                      <SelectContent>
                        {FUNCTIONAL_ROLE_OPTIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div
            role="group"
            className="flex shrink-0 flex-row flex-wrap items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4"
          >
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="outline">
              Save &amp; New
            </Button>
            <Button type="button">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}

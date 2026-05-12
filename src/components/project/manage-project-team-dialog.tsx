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
import { cn } from '@/lib/utils'
import { Info, Search, Undo2, User, Users, X } from 'lucide-react'
import { useId, useState } from 'react'

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

export function ManageProjectTeamDialog({
  projectName,
}: {
  /** Shown in the Project field for layout preview */
  projectName: string
}) {
  const [open, setOpen] = useState(false)
  const [collaborator, setCollaborator] = useState(true)
  const baseId = useId()

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
            'flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0',
            'sm:max-w-3xl'
          )}
        >
          <DialogHeader className="shrink-0 border-b border-gray-100 px-6 pb-4 pt-6 text-center">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              New Project Team
            </DialogTitle>
          </DialogHeader>

          <div className="flex shrink-0 items-center justify-end border-b border-gray-50 px-6 py-2">
            <p className="text-xs text-gray-500">
              <span className="font-medium text-red-500">*</span> = Required Information
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-6">
              <section className="space-y-3">
                <div className="-mx-6 border-y border-gray-200 bg-gray-100 px-6 py-2 text-sm font-semibold text-gray-800">
                  Information
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor={`${baseId}-member-no`}>Team Member Number</FieldLabel>
                    <Input id={`${baseId}-member-no`} placeholder="" className="h-9" />
                  </div>
                  <div className="relative">
                    <div className="mb-1 flex items-center justify-between">
                      <FieldLabel htmlFor={`${baseId}-role`} className="mb-0">
                        Role
                      </FieldLabel>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="Undo role change"
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Select defaultValue="business-analyst">
                      <SelectTrigger
                        id={`${baseId}-role`}
                        className="h-9 border-pink-300 ring-2 ring-pink-300 ring-offset-0"
                      >
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="business-analyst">Business Analyst</SelectItem>
                        <SelectItem value="developer">Developer</SelectItem>
                        <SelectItem value="pm">Project Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <FieldLabel required htmlFor={`${baseId}-project`}>
                      Project
                    </FieldLabel>
                    <div className="relative">
                      <Input
                        id={`${baseId}-project`}
                        readOnly
                        value={projectName}
                        className="h-9 pr-9"
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        aria-label="Clear project"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <FieldLabel htmlFor={`${baseId}-rate`}>Hourly Rate</FieldLabel>
                    <Input id={`${baseId}-rate`} placeholder="" className="h-9" />
                  </div>

                  <div>
                    <FieldLabel htmlFor={`${baseId}-contact`}>Contact</FieldLabel>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        id={`${baseId}-contact`}
                        placeholder="Search Contacts..."
                        className="h-9 pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
                      <input
                        type="checkbox"
                        checked={collaborator}
                        onChange={(e) => setCollaborator(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-medium">Add as Collaborator</span>
                      <InfoHint text="When enabled, this member can access the project according to the permission level below." />
                    </label>
                    <div>
                      <FieldLabel className="inline-flex items-center" htmlFor={`${baseId}-perm`}>
                        Collaborator Permission Level
                        <InfoHint text="Controls what this collaborator can view or edit in the project." />
                      </FieldLabel>
                      <Select defaultValue="viewer">
                        <SelectTrigger id={`${baseId}-perm`} className="h-9">
                          <SelectValue placeholder="Permission" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <FieldLabel className="mb-0">User</FieldLabel>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="Undo user change"
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 rounded-md border border-pink-300 bg-white px-3 py-2 ring-2 ring-pink-300">
                      <User className="h-4 w-4 shrink-0 text-gray-500" />
                      <span className="flex-1 text-sm text-gray-900">Karen Guanzon</span>
                      <button
                        type="button"
                        className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        aria-label="Clear user"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="hidden sm:block" aria-hidden />

                  <div>
                    <FieldLabel htmlFor={`${baseId}-queue`}>Queue Name</FieldLabel>
                    <Input id={`${baseId}-queue`} placeholder="" className="h-9" />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="-mx-6 border-y border-gray-200 bg-gray-100 px-6 py-2 text-sm font-semibold text-gray-800">
                  Resource Allocation
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor={`${baseId}-model`}>Assignment Model</FieldLabel>
                    <Select defaultValue="task">
                      <SelectTrigger id={`${baseId}-model`} className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="task">Task</SelectItem>
                        <SelectItem value="capacity">Capacity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel className="inline-flex items-center" htmlFor={`${baseId}-allocated`}>
                      Total Allocated Effort
                      <InfoHint text="Planned effort for this team member on the project." />
                    </FieldLabel>
                    <Input id={`${baseId}-allocated`} placeholder="" className="h-9" />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel className="inline-flex items-center" htmlFor={`${baseId}-actual`}>
                      Total Actual Effort
                      <InfoHint text="Recorded effort (read-only in this preview)." />
                    </FieldLabel>
                    <Input id={`${baseId}-actual`} disabled placeholder="" className="h-9 bg-gray-50" />
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

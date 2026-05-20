'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'
import { TENANT_SLUG_HEADER } from '@/lib/tenant/resolve'
import Stepper, { Step } from '@/components/react-bits/Stepper/Stepper'
import { cn } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Phase = {
  title: string
  is_gated: boolean
  processes: {
    name: string
    methodology: 'scrum' | 'kanban' | 'waterfall' | 'devops'
  }[]
}

const DEFAULT_PHASES: Phase[] = [
  { title: 'Requirements', is_gated: true, processes: [{ name: 'Requirements Workshop', methodology: 'kanban' }] },
  { title: 'Design', is_gated: true, processes: [{ name: 'Solution Design', methodology: 'kanban' }] },
  { title: 'Development', is_gated: true, processes: [{ name: 'Feature Delivery Sprint', methodology: 'scrum' }] },
  { title: 'Testing', is_gated: true, processes: [{ name: 'Quality Validation', methodology: 'kanban' }] },
  { title: 'Deployment', is_gated: false, processes: [{ name: 'Release Management', methodology: 'devops' }] },
]

export function SetupWizard(props: { tenantSlug: string }) {
  return (
    <SetupProjectWizard
      title="Tenant Setup Wizard"
      description="Configure your first project. This is where “Hybrid SDLC” becomes real: phases are sequential milestones, and each phase can run Scrum or Kanban."
      submitEndpoint="/api/onboarding/bootstrap"
      tenantSlug={props.tenantSlug}
      showSignOut
      cancelHref={null}
    />
  )
}

type SetupProjectWizardProps = {
  title: string
  description: string
  submitEndpoint: string
  tenantSlug?: string | null
  showSignOut?: boolean
  /** Where Cancel navigates. Pass `null` to hide Cancel (e.g. forced onboarding). */
  cancelHref?: string | null
}

export function SetupProjectWizard({
  title,
  description,
  submitEndpoint,
  tenantSlug,
  showSignOut = false,
  cancelHref = '/dashboard/projects',
}: SetupProjectWizardProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const [projectName, setProjectName] = useState('My First Project')
  const [projectDescription, setProjectDescription] = useState('')
  const [phaseGatingEnabled, setPhaseGatingEnabled] = useState(true)
  const [phases, setPhases] = useState<Phase[]>(DEFAULT_PHASES)
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 3

  const [existingProjectNames, setExistingProjectNames] = useState<string[]>([])
  const [errorModalOpen, setErrorModalOpen] = useState(false)
  const [errorModalMessage, setErrorModalMessage] = useState('')

  useEffect(() => {
    let active = true
    async function loadProjects() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !active) return

        let orgId: string | null = null

        if (tenantSlug) {
          const { data: orgBySlug } = await supabase
            .from('organizations')
            .select('id')
            .eq('slug', tenantSlug)
            .maybeSingle()
          orgId = orgBySlug?.id ?? null
        }

        if (!orgId) {
          const { data: members } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', user.id)

          if (members && members.length > 0) {
            orgId = members[0].organization_id
          }
        }

        if (orgId && active) {
          const { data: projects } = await supabase
            .from('projects')
            .select('name')
            .eq('organization_id', orgId)

          if (projects && active) {
            setExistingProjectNames(projects.map((p: { name: string }) => p.name.trim().toLowerCase()))
          }
        }
      } catch (err) {
        console.error('Failed to load existing projects for validation:', err)
      }
    }
    loadProjects()
    return () => {
      active = false
    }
  }, [tenantSlug])

  const isNameDuplicate = useMemo(() => {
    return existingProjectNames.includes(projectName.trim().toLowerCase())
  }, [projectName, existingProjectNames])

  const isValid = useMemo(() => {
    return (
      projectName.trim().length > 0 &&
      !isNameDuplicate &&
      phases.filter(
        (phase) =>
          phase.title.trim().length > 0 &&
          phase.processes.some((process) => process.name.trim().length > 0)
      ).length > 0
    )
  }, [projectName, phases, isNameDuplicate])

  const validationErrorMessage = useMemo(() => {
    if (projectName.trim().length === 0) {
      return 'Please enter a project name.'
    }
    if (isNameDuplicate) {
      return 'A project with this name already exists in your organization.'
    }
    const hasValidPhases = phases.filter(
      (phase) =>
        phase.title.trim().length > 0 &&
        phase.processes.some((process) => process.name.trim().length > 0)
    ).length > 0

    if (!hasValidPhases) {
      return 'Please add at least one phase with a process before completing setup.'
    }
    return null
  }, [projectName, isNameDuplicate, phases])

  const submit = async (): Promise<boolean> => {
    if (!isValid) return false
    setSaving(true)
    try {
      const res = await fetch(submitEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tenantSlug ? { [TENANT_SLUG_HEADER]: tenantSlug } : {}),
        },
        body: JSON.stringify({
          projectName,
          projectDescription,
          phaseGatingEnabled,
          phases,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to create project')

      const projectId = json?.data?.project_id as string | undefined
      if (!projectId) throw new Error('Project created, but missing project id')

      router.push(`/dashboard/projects/${projectId}`)
      router.refresh()
      return true
    } catch (e) {
      console.error(e)
      setErrorModalMessage(e instanceof Error ? e.message : 'Failed to complete setup')
      setErrorModalOpen(true)
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)
      await supabase.auth.signOut()
      window.location.href = '/auth/login'
    } finally {
      setIsSigningOut(false)
    }
  }

  const handleCancel = () => {
    if (cancelHref) {
      router.push(cancelHref)
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-6.5rem)] flex-col justify-center bg-gray-50 px-4 py-4 text-slate-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            <p className="mt-2 text-gray-600">{description}</p>
            {tenantSlug ? (
              <div className="mt-3 text-xs text-gray-500">
                Tenant: <Badge variant="outline">{tenantSlug}</Badge>
              </div>
            ) : null}
          </div>
          {cancelHref || showSignOut ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {cancelHref ? (
                <Button type="button" variant="ghost" onClick={handleCancel} disabled={saving}>
                  Cancel
                </Button>
              ) : null}
              {showSignOut ? (
                <Button type="button" variant="outline" onClick={handleSignOut} disabled={isSigningOut}>
                  {isSigningOut ? 'Signing out...' : 'Sign out'}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        <Stepper
          initialStep={1}
          onStepChange={setCurrentStep}
          onFinalStepCompleted={submit}
          className="rb-stepper__outer-container--embed"
          contentClassName="rb-stepper__content--modal"
          backButtonText="Back"
          nextButtonText="Next"
          stepCircleContainerClassName="rb-stepper__wide"
          nextButtonProps={{
            disabled: saving || (currentStep === totalSteps && !isValid),
          }}
        >
          <Step>
            <Card className="border-gray-200 bg-white text-slate-900 shadow-sm [&_input]:bg-white [&_input]:text-slate-900">
              <CardHeader>
                <CardTitle>Project basics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project name</label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className={cn(
                      "transition-all duration-200",
                      isNameDuplicate ? "border-red-500 ring-2 ring-red-100 focus-visible:ring-red-500 focus-visible:border-red-500" : ""
                    )}
                  />
                  {isNameDuplicate && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      <AlertCircle className="h-4 w-4" />
                      A project with this name already exists in your organization.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                  <Input value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={phaseGatingEnabled}
                    onChange={(e) => setPhaseGatingEnabled(e.target.checked)}
                  />
                  Enable phase gating (locks future phases until previous is completed)
                </label>
              </CardContent>
            </Card>
          </Step>

          <Step>
            <Card className="border-gray-200 bg-white text-slate-900 shadow-sm [&_input]:bg-white [&_input]:text-slate-900 [&_select]:text-slate-900">
              <CardHeader>
                <CardTitle>Phases (sequential milestones)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Each phase can contain one or more processes. Set execution methods per process (Scrum, Kanban,
                  Waterfall, or DevOps).
                </p>
                <div className="space-y-3">
                  {phases.map((p, idx) => (
                    <div key={idx} className="rounded-lg border border-gray-200 bg-white p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">Phase {idx + 1}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPhases((prev) => prev.filter((_, i) => i !== idx))}
                          disabled={phases.length <= 1}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Phase title</label>
                          <Input
                            value={p.title}
                            onChange={(e) =>
                              setPhases((prev) =>
                                prev.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x))
                              )
                            }
                          />
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={p.is_gated}
                            onChange={(e) =>
                              setPhases((prev) =>
                                prev.map((x, i) => (i === idx ? { ...x, is_gated: e.target.checked } : x))
                              )
                            }
                          />
                          Gated
                        </label>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-gray-600">Processes</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPhases((prev) =>
                                prev.map((x, i) =>
                                  i === idx
                                    ? {
                                        ...x,
                                        processes: [...x.processes, { name: 'New Process', methodology: 'kanban' }],
                                      }
                                    : x
                                )
                              )
                            }
                          >
                            Add process
                          </Button>
                        </div>
                        {p.processes.map((process, processIdx) => (
                          <div
                            key={processIdx}
                            className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-2 items-end rounded border border-gray-100 p-2"
                          >
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Process name</label>
                              <Input
                                value={process.name}
                                onChange={(e) =>
                                  setPhases((prev) =>
                                    prev.map((x, i) =>
                                      i === idx
                                        ? {
                                            ...x,
                                            processes: x.processes.map((y, j) =>
                                              j === processIdx ? { ...y, name: e.target.value } : y
                                            ),
                                          }
                                        : x
                                    )
                                  )
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Execution method</label>
                              <select
                                value={process.methodology}
                                onChange={(e) =>
                                  setPhases((prev) =>
                                    prev.map((x, i) =>
                                      i === idx
                                        ? {
                                            ...x,
                                            processes: x.processes.map((y, j) =>
                                              j === processIdx
                                                ? { ...y, methodology: e.target.value as typeof y.methodology }
                                                : y
                                            ),
                                          }
                                        : x
                                    )
                                  )
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                              >
                                <option value="scrum">Scrum</option>
                                <option value="kanban">Kanban</option>
                                <option value="waterfall">Waterfall</option>
                                <option value="devops">DevOps</option>
                              </select>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setPhases((prev) =>
                                  prev.map((x, i) =>
                                    i === idx
                                      ? {
                                          ...x,
                                          processes: x.processes.filter((_, j) => j !== processIdx),
                                        }
                                      : x
                                  )
                                )
                              }
                              disabled={p.processes.length <= 1}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-start">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setPhases((p) => [
                        ...p,
                        {
                          title: 'New Phase',
                          is_gated: true,
                          processes: [{ name: 'New Process', methodology: 'kanban' }],
                        },
                      ])
                    }
                  >
                    Add phase
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Step>

          <Step>
            <Card className="border-gray-200 bg-white text-slate-900 shadow-sm">
              <CardHeader>
                <CardTitle>Review & create</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
                  <div className="font-medium">Project</div>
                  <div className="mt-1">{projectName}</div>
                  {projectDescription ? <div className="mt-1 text-gray-500">{projectDescription}</div> : null}
                  <div className="mt-2 text-xs text-gray-500">
                    Phase gating: <strong>{phaseGatingEnabled ? 'Enabled' : 'Disabled'}</strong>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
                  <div className="font-medium mb-2">Phases</div>
                  <div className="space-y-2">
                    {phases
                      .filter((p) => p.title.trim())
                      .map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">
                              {idx + 1}. {p.title}
                            </span>
                            <div className="mt-1 text-xs text-gray-500">
                              {p.processes
                                .filter((process) => process.name.trim())
                                .map((process) => `${process.name} (${process.methodology})`)
                                .join(' · ')}
                            </div>
                          </div>
                          <Badge variant="outline">{p.is_gated ? 'gated' : 'not gated'}</Badge>
                        </div>
                      ))}
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    Workflow stages are created from each phase&apos;s primary process. Scrum uses a Backlog stage and DevOps
                    uses release-oriented stages by default.
                  </div>
                </div>

                {validationErrorMessage ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    {validationErrorMessage}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </Step>
        </Stepper>

        <Dialog open={errorModalOpen} onOpenChange={setErrorModalOpen}>
          <DialogContent className="sm:max-w-md border-red-100 bg-white">
            <DialogHeader>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 mb-4">
                <AlertCircle className="h-6 w-6" aria-hidden="true" />
              </div>
              <DialogTitle className="text-center text-xl font-semibold text-gray-900">
                Project Creation Error
              </DialogTitle>
              <DialogDescription className="text-center text-sm text-gray-600 mt-2">
                {errorModalMessage}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 justify-center sm:justify-center">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setErrorModalOpen(false)}
                className="w-full sm:w-auto px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md shadow-sm transition-all"
              >
                Okay
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}


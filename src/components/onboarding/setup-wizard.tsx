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
  assigned_team_id?: string | null
  assigned_user_id?: string | null
  processes: {
    name: string
    methodology: 'scrum' | 'kanban' | 'waterfall' | 'devops'
    assigned_team_id?: string | null
    assigned_user_id?: string | null
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

  // Teams and Members loaded from database
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([])
  const [members, setMembers] = useState<{ userId: string; fullName: string; email: string }[]>([])
  const [skipAssignments, setSkipAssignments] = useState(false)

  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 4

  const [existingProjectNames, setExistingProjectNames] = useState<string[]>([])
  const [errorModalOpen, setErrorModalOpen] = useState(false)
  const [errorModalMessage, setErrorModalMessage] = useState('')

  const getTeamName = (id?: string | null) => teams.find((t) => t.id === id)?.name || ''
  const getMemberName = (id?: string | null) => members.find((m) => m.userId === id)?.fullName || ''

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
          const [projectsRes, teamsRes, membersRes] = await Promise.all([
            supabase
              .from('projects')
              .select('name')
              .eq('organization_id', orgId),
            supabase
              .from('teams')
              .select('id, name')
              .eq('organization_id', orgId)
              .order('name', { ascending: true }),
            supabase
              .from('organization_members')
              .select(`
                user_id,
                profiles:user_id (
                  full_name,
                  email
                )
              `)
              .eq('organization_id', orgId)
          ])

          if (!active) return

          if (projectsRes.data) {
            setExistingProjectNames(projectsRes.data.map((p: any) => p.name.trim().toLowerCase()))
          }

          if (teamsRes.data) {
            setTeams(teamsRes.data as { id: string; name: string }[])
          }

          if (membersRes.data) {
            const normalizedMembers = membersRes.data
              .map((m: any) => {
                const profile = m.profiles
                const fullName = profile?.full_name || 'Unknown Member'
                const email = profile?.email || ''
                return {
                  userId: m.user_id,
                  fullName,
                  email,
                }
              })
              .filter((m) => m.userId)
            setMembers(normalizedMembers)
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

    // Clear assignments if skipped
    const finalPhases = skipAssignments
      ? phases.map((p) => ({
          ...p,
          assigned_team_id: null,
          assigned_user_id: null,
          processes: p.processes.map((pr) => ({
            ...pr,
            assigned_team_id: null,
            assigned_user_id: null,
          })),
        }))
      : phases

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
          phases: finalPhases,
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
            <Card className="border-gray-200 bg-white text-slate-900 shadow-sm [&_select]:text-slate-900">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle>Assign teams & members (Optional)</CardTitle>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipAssignments}
                      onChange={(e) => setSkipAssignments(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    Skip assignments for now
                  </label>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Assign teams or specific members to drive each phase and process. You can skip this now and edit assignments anytime in project settings.
                </p>

                {skipAssignments ? (
                  <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 text-center text-gray-500">
                    <div className="text-sm font-medium text-gray-900 mb-1">Assignments Skipped</div>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                      No teams or members will be assigned during setup. You can always configure these later from your project settings or dashboard.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[40dvh] overflow-y-auto pr-1">
                    {phases.map((p, idx) => (
                      <div key={idx} className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-2">
                          <span className="text-sm font-semibold text-gray-900">
                            Phase {idx + 1}: {p.title || 'New Phase'}
                          </span>
                        </div>
                        
                        {/* Phase assignments */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Assign Team to Phase</label>
                            <select
                              value={p.assigned_team_id || ''}
                              onChange={(e) => {
                                const val = e.target.value || null
                                setPhases((prev) =>
                                  prev.map((x, i) => (i === idx ? { ...x, assigned_team_id: val } : x))
                                )
                              }}
                              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white text-sm"
                            >
                              <option value="">Unassigned</option>
                              {teams.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Assign Member to Phase</label>
                            <select
                              value={p.assigned_user_id || ''}
                              onChange={(e) => {
                                const val = e.target.value || null
                                setPhases((prev) =>
                                  prev.map((x, i) => (i === idx ? { ...x, assigned_user_id: val } : x))
                                )
                              }}
                              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white text-sm"
                            >
                              <option value="">Unassigned</option>
                              {members.map((m) => (
                                <option key={m.userId} value={m.userId}>{m.fullName} ({m.email})</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Nested process assignments */}
                        {p.processes.length > 0 && (
                          <div className="mt-3 pl-3 border-l-2 border-gray-100 space-y-2">
                            <p className="text-xs font-medium text-gray-400">Process Assignments</p>
                            {p.processes.map((process, processIdx) => (
                              <div
                                key={processIdx}
                                className="rounded border border-gray-100 bg-gray-50/30 p-2 space-y-2"
                              >
                                <div className="text-xs font-medium text-gray-700">
                                  Process: {process.name || 'New Process'}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[10px] font-medium text-gray-400 mb-0.5">Assign Team</label>
                                    <select
                                      value={process.assigned_team_id || ''}
                                      onChange={(e) => {
                                        const val = e.target.value || null
                                        setPhases((prev) =>
                                          prev.map((x, i) =>
                                            i === idx
                                              ? {
                                                  ...x,
                                                  processes: x.processes.map((y, j) =>
                                                    j === processIdx ? { ...y, assigned_team_id: val } : y
                                                  ),
                                                }
                                              : x
                                          )
                                        )
                                      }}
                                      className="w-full px-2 py-1.5 border border-gray-200 rounded bg-white text-xs"
                                    >
                                      <option value="">Unassigned</option>
                                      {teams.map((t) => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-medium text-gray-400 mb-0.5">Assign Member</label>
                                    <select
                                      value={process.assigned_user_id || ''}
                                      onChange={(e) => {
                                        const val = e.target.value || null
                                        setPhases((prev) =>
                                          prev.map((x, i) =>
                                            i === idx
                                              ? {
                                                  ...x,
                                                  processes: x.processes.map((y, j) =>
                                                    j === processIdx ? { ...y, assigned_user_id: val } : y
                                                  ),
                                                }
                                              : x
                                          )
                                        )
                                      }}
                                      className="w-full px-2 py-1.5 border border-gray-200 rounded bg-white text-xs"
                                    >
                                      <option value="">Unassigned</option>
                                      {members.map((m) => (
                                        <option key={m.userId} value={m.userId}>{m.fullName}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
                  <div className="font-medium mb-2">Phases & Assignments</div>
                  <div className="space-y-3">
                    {phases
                      .filter((p) => p.title.trim())
                      .map((p, idx) => {
                        const phaseTeam = getTeamName(p.assigned_team_id)
                        const phaseMember = getMemberName(p.assigned_user_id)
                        const hasPhaseAssignment = !skipAssignments && (phaseTeam || phaseMember)

                        return (
                          <div key={idx} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium text-gray-900">
                                  {idx + 1}. {p.title}
                                </span>
                                <div className="mt-1 text-xs text-gray-500">
                                  {p.processes
                                    .filter((process) => process.name.trim())
                                    .map((process) => {
                                      const procTeam = getTeamName(process.assigned_team_id)
                                      const procMember = getMemberName(process.assigned_user_id)
                                      const hasProcAssignment = !skipAssignments && (procTeam || procMember)
                                      const assignmentStr = hasProcAssignment
                                        ? ` [Assigned: ${[procTeam, procMember].filter(Boolean).join(', ')}]`
                                        : ''
                                      return `${process.name} (${process.methodology})${assignmentStr}`
                                    })
                                    .join(' · ')}
                                </div>
                              </div>
                              <Badge variant="outline">{p.is_gated ? 'gated' : 'not gated'}</Badge>
                            </div>
                            {hasPhaseAssignment && (
                              <div className="mt-1 text-xs text-blue-600 font-medium">
                                Phase Owner: {[phaseTeam, phaseMember].filter(Boolean).join(' / ')}
                              </div>
                            )}
                          </div>
                        )
                      })}
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


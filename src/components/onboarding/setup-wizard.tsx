'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'

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
      submitLabel="Finish setup"
      tenantSlug={props.tenantSlug}
      showSignOut
    />
  )
}

type SetupProjectWizardProps = {
  title: string
  description: string
  submitEndpoint: string
  submitLabel?: string
  tenantSlug?: string | null
  showSignOut?: boolean
}

export function SetupProjectWizard({
  title,
  description,
  submitEndpoint,
  submitLabel = 'Finish setup',
  tenantSlug,
  showSignOut = false,
}: SetupProjectWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [saving, setSaving] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const [projectName, setProjectName] = useState('My First Project')
  const [projectDescription, setProjectDescription] = useState('')
  const [phaseGatingEnabled, setPhaseGatingEnabled] = useState(true)
  const [phases, setPhases] = useState<Phase[]>(DEFAULT_PHASES)

  const isValid = useMemo(() => {
    return (
      projectName.trim().length > 0 &&
      phases.filter(
        (phase) =>
          phase.title.trim().length > 0 &&
          phase.processes.some((process) => process.name.trim().length > 0)
      ).length > 0
    )
  }, [projectName, phases])

  const submit = async () => {
    if (!isValid) return
    setSaving(true)
    try {
      const res = await fetch(submitEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Failed to complete setup')
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
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
          {showSignOut ? (
            <Button type="button" variant="outline" onClick={handleSignOut} disabled={isSigningOut}>
              {isSigningOut ? 'Signing out...' : 'Sign out'}
            </Button>
          ) : null}
        </div>

        <div className="flex gap-2">
          <Badge className={step === 1 ? 'bg-blue-600' : 'bg-gray-200 text-gray-700'}>1. Project</Badge>
          <Badge className={step === 2 ? 'bg-blue-600' : 'bg-gray-200 text-gray-700'}>2. Phases</Badge>
          <Badge className={step === 3 ? 'bg-blue-600' : 'bg-gray-200 text-gray-700'}>3. Review</Badge>
        </div>

        {step === 1 ? (
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle>Project basics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project name</label>
                <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
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

              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!projectName.trim()}>
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {step === 2 ? (
          <Card className="border-gray-200 shadow-sm">
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
                            setPhases((prev) => prev.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)))
                          }
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={p.is_gated}
                          onChange={(e) =>
                            setPhases((prev) => prev.map((x, i) => (i === idx ? { ...x, is_gated: e.target.checked } : x)))
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

              <div className="flex items-center justify-between">
                <Button
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
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={
                      phases.filter(
                        (phase) =>
                          phase.title.trim().length > 0 &&
                          phase.processes.some((process) => process.name.trim().length > 0)
                      ).length === 0
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {step === 3 ? (
          <Card className="border-gray-200 shadow-sm">
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

              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button onClick={submit} disabled={!isValid || saving}>
                  {saving ? 'Creating…' : submitLabel}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}


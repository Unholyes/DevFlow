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
  methodology: 'scrum' | 'kanban'
  is_gated: boolean
}

const DEFAULT_PHASES: Phase[] = [
  { title: 'Requirements', methodology: 'scrum', is_gated: true },
  { title: 'Design', methodology: 'kanban', is_gated: true },
  { title: 'Development', methodology: 'scrum', is_gated: true },
  { title: 'Testing', methodology: 'kanban', is_gated: true },
  { title: 'Deployment', methodology: 'kanban', is_gated: false },
]

export function SetupWizard(props: { tenantSlug: string }) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [saving, setSaving] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const [projectName, setProjectName] = useState('My First Project')
  const [projectDescription, setProjectDescription] = useState('')
  const [phaseGatingEnabled, setPhaseGatingEnabled] = useState(true)
  const [phases, setPhases] = useState<Phase[]>(DEFAULT_PHASES)

  const isValid = useMemo(() => {
    return projectName.trim().length > 0 && phases.filter((p) => p.title.trim().length > 0).length > 0
  }, [projectName, phases])

  const submit = async () => {
    if (!isValid) return
    setSaving(true)
    try {
      const res = await fetch('/api/onboarding/bootstrap', {
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
            <h1 className="text-3xl font-bold text-gray-900">Tenant Setup Wizard</h1>
            <p className="mt-2 text-gray-600">
              Configure your first project. This is where “Hybrid SDLC” becomes real: phases are sequential milestones,
              and each phase can run Scrum or Kanban.
            </p>
            <div className="mt-3 text-xs text-gray-500">
              Tenant: <Badge variant="outline">{props.tenantSlug}</Badge>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={handleSignOut} disabled={isSigningOut}>
            {isSigningOut ? 'Signing out...' : 'Sign out'}
          </Button>
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
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Execution method</label>
                        <select
                          value={p.methodology}
                          onChange={(e) =>
                            setPhases((prev) =>
                              prev.map((x, i) =>
                                i === idx ? { ...x, methodology: e.target.value as Phase['methodology'] } : x
                              )
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                        >
                          <option value="scrum">Scrum</option>
                          <option value="kanban">Kanban</option>
                        </select>
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
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setPhases((p) => [...p, { title: 'New Phase', methodology: 'kanban', is_gated: true }])}>
                  Add phase
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button onClick={() => setStep(3)} disabled={phases.filter((p) => p.title.trim()).length === 0}>
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
                          <span className="font-medium">{idx + 1}. {p.title}</span>{' '}
                          <span className="text-gray-500">({p.methodology})</span>
                        </div>
                        <Badge variant="outline">{p.is_gated ? 'gated' : 'not gated'}</Badge>
                      </div>
                    ))}
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  Default workflow stages will be created automatically per phase (Scrum includes a Backlog stage and a Done stage).
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button onClick={submit} disabled={!isValid || saving}>
                  {saving ? 'Creating…' : 'Finish setup'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}


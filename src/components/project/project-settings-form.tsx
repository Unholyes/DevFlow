'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type ProjectSettingsFormProps = {
  project: {
    id: string
    name: string
    description: string
    status: 'active' | 'completed' | 'archived'
    phaseGatingEnabled: boolean
  }
}

export function ProjectSettingsForm({ project }: ProjectSettingsFormProps) {
  const router = useRouter()
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description)
  const [status, setStatus] = useState<ProjectSettingsFormProps['project']['status']>(project.status)
  const [phaseGatingEnabled, setPhaseGatingEnabled] = useState(project.phaseGatingEnabled)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const saveSettings = async () => {
    if (!name.trim()) {
      alert('Project name is required.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          status,
          phaseGatingEnabled,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error || 'Failed to save settings')
      }

      alert('Project settings saved.')
      router.refresh()
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const deleteProject = async () => {
    const confirmed = window.confirm(
      'Delete this project permanently? This will remove its phases, tasks, sprints, and related workflow data.'
    )
    if (!confirmed) return

    const secondConfirm = window.prompt('Type DELETE to confirm project deletion.')
    if (secondConfirm !== 'DELETE') {
      alert('Deletion cancelled. Confirmation text did not match.')
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error || 'Failed to delete project')
      }

      router.push('/dashboard/projects')
      router.refresh()
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : 'Failed to delete project')
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/dashboard/projects/${project.id}`} className="text-sm font-medium text-gray-600 hover:text-blue-600">
          Back to project
        </Link>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle>Project settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Project name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectSettingsFormProps['project']['status'])}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={phaseGatingEnabled}
              onChange={(e) => setPhaseGatingEnabled(e.target.checked)}
            />
            Enable phase gating
          </label>

          <div className="flex justify-end">
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-red-700">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            Deleting a project is permanent and cannot be undone.
          </p>
          <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" onClick={deleteProject} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete project'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

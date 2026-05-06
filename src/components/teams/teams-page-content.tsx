'use client'

import { useMemo, useState } from 'react'
import { Plus, Search, Users } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

type TeamRow = {
  id: string
  organization_id: string
  name: string
  description: string | null
  created_at: string
}

function normalizeTeamName(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export function TeamsPageContent({
  organizationId,
  currentUserId: _currentUserId,
  initialTeams,
}: {
  organizationId: string
  currentUserId: string
  initialTeams: TeamRow[]
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [teams, setTeams] = useState<TeamRow[]>(initialTeams ?? [])

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const filteredTeams = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return teams
    return teams.filter((t) => t.name.toLowerCase().includes(q))
  }, [query, teams])

  async function handleCreateTeam() {
    if (isCreating) return
    setIsCreating(true)
    setCreateError(null)

    const name = normalizeTeamName(createName)
    const description = createDescription.trim()

    try {
      const res = await fetch(`/api/organizations/${encodeURIComponent(organizationId)}/teams`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, description: description.length ? description : null }),
      })

      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(payload?.error ?? 'Failed to create team.')
      }

      const team = payload?.team as TeamRow | undefined
      if (!team?.id) throw new Error(payload?.error ?? 'Failed to create team.')

      setTeams((cur) => [...cur, team])
      setIsCreateOpen(false)
      setCreateName('')
      setCreateDescription('')
      router.push(`/dashboard/teams/${encodeURIComponent(team.id)}`)
    } catch (e: any) {
      setCreateError(e?.message ?? 'Failed to create team.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="pt-6">
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-lg text-gray-900">Teams</CardTitle>
              <CardDescription>Group members into teams for easier management.</CardDescription>
            </div>

            <Dialog
              open={isCreateOpen}
              onOpenChange={(v) => {
                setIsCreateOpen(v)
                if (!v) {
                  setCreateError(null)
                  setCreateName('')
                  setCreateDescription('')
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="bg-blue-600 text-white hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Team
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create team</DialogTitle>
                  <DialogDescription>Name your team and add members next.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Team name</label>
                    <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="e.g. Engineering" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Description (optional)</label>
                    <Input
                      value={createDescription}
                      onChange={(e) => setCreateDescription(e.target.value)}
                      placeholder="What does this team own?"
                    />
                  </div>

                  {createError ? <div className="text-sm text-red-600">{createError}</div> : null}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>
                    Cancel
                  </Button>
                  <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={handleCreateTeam} disabled={isCreating}>
                    {isCreating ? 'Creating…' : 'Create'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search teams…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-gray-200 bg-white pl-9"
            />
          </div>

          {filteredTeams.length === 0 ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="mt-4 text-base font-semibold text-gray-900">No teams created yet.</div>
                <div className="mt-1 text-sm text-gray-500">Create your first team to start grouping members.</div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTeams.map((t) => (
                <Link
                  key={t.id}
                  href={`/dashboard/teams/${encodeURIComponent(t.id)}`}
                  className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-gray-900">{t.name}</div>
                      {t.description ? <div className="truncate text-sm text-gray-500">{t.description}</div> : null}
                    </div>
                    <div className="text-sm text-gray-500">Open</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


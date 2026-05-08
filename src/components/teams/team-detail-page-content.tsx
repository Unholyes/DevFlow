'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Plus, Search, Users, X } from 'lucide-react'
import Link from 'next/link'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase/client'

type TeamRow = {
  id: string
  organization_id: string
  name: string
  description: string | null
  created_at: string
  created_by: string | null
}

type TeamMemberRow = {
  team_id: string
  user_id: string
  team_role: 'lead' | 'member'
  created_at: string
  profiles?: { id: string; full_name: string | null; email: string | null } | null
}

type OrgMemberCandidate = {
  user_id: string
  profiles?: { full_name: string | null; email: string | null } | null
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const a = parts[0]?.[0] ?? 'U'
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return (a + b).toUpperCase()
}

export function TeamDetailPageContent({
  organizationId,
  team,
}: {
  organizationId: string
  currentUserId: string
  team: TeamRow
}) {
  const [members, setMembers] = useState<TeamMemberRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [addQuery, setAddQuery] = useState('')
  const [candidates, setCandidates] = useState<OrgMemberCandidate[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadMembers() {
      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/teams/${encodeURIComponent(team.id)}/members`, { method: 'GET' })
        const payload = await res.json().catch(() => null)
        if (!res.ok) throw new Error(payload?.error ?? 'Failed to load team members.')

        const rows = (payload?.members ?? []) as TeamMemberRow[]
        if (!cancelled) setMembers(rows)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load team members.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadMembers()
    return () => {
      cancelled = true
    }
  }, [team.id])

  useEffect(() => {
    let cancelled = false

    async function loadCandidates() {
      if (!isAddOpen) return
      setCandidates([])

      const { data, error } = await supabase
        .from('organization_members')
        .select(
          `
          user_id,
          profiles:user_id (
            full_name,
            email
          )
        `,
        )
        .eq('organization_id', organizationId)
        .order('joined_at', { ascending: true })

      if (cancelled) return
      if (error) {
        setError(error.message)
        return
      }

      setCandidates((data ?? []) as any)
    }

    void loadCandidates()
    return () => {
      cancelled = true
    }
  }, [isAddOpen, organizationId])

  const memberIds = useMemo(() => new Set(members.map((m) => m.user_id)), [members])

  const filteredCandidates = useMemo(() => {
    const q = addQuery.trim().toLowerCase()
    const base = candidates.filter((c) => c.user_id && !memberIds.has(c.user_id))
    if (!q) return base.slice(0, 10)

    return base
      .filter((c) => {
        const name = String(c.profiles?.full_name ?? '').toLowerCase()
        const email = String(c.profiles?.email ?? '').toLowerCase()
        return name.includes(q) || email.includes(q)
      })
      .slice(0, 10)
  }, [addQuery, candidates, memberIds])

  async function handleAddMembers() {
    if (isSubmitting) return
    if (selectedUserIds.length === 0) return
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/teams/${encodeURIComponent(team.id)}/members`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userIds: selectedUserIds, team_role: 'member' }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error ?? 'Failed to add members.')

      // Refresh list
      const reload = await fetch(`/api/teams/${encodeURIComponent(team.id)}/members`, { method: 'GET' })
      const reloadPayload = await reload.json().catch(() => null)
      if (reload.ok) setMembers((reloadPayload?.members ?? []) as TeamMemberRow[])

      setIsAddOpen(false)
      setAddQuery('')
      setSelectedUserIds([])
    } catch (e: any) {
      setError(e?.message ?? 'Failed to add members.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRemove(userId: string) {
    if (!window.confirm('Remove this member from the team?')) return
    setError(null)

    const prev = members
    setMembers((cur) => cur.filter((m) => m.user_id !== userId))

    try {
      const res = await fetch(`/api/teams/${encodeURIComponent(team.id)}/members`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error ?? 'Failed to remove member.')
    } catch (e: any) {
      setMembers(prev)
      setError(e?.message ?? 'Failed to remove member.')
    }
  }

  return (
    <div className="space-y-6 pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2">
            <Button asChild variant="ghost" className="-ml-2 h-8 px-2 text-slate-600 hover:text-slate-900">
              <Link href="/dashboard/accounts?tab=teams">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to teams
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-500" />
            <h1 className="truncate text-xl font-semibold text-gray-900">{team.name}</h1>
          </div>
          {team.description ? <div className="mt-1 text-sm text-gray-500">{team.description}</div> : null}
        </div>

        <Dialog
          open={isAddOpen}
          onOpenChange={(v) => {
            setIsAddOpen(v)
            if (!v) {
              setAddQuery('')
              setSelectedUserIds([])
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-blue-600 text-white hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Add members
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg p-0">
            <DialogHeader className="space-y-1 border-b border-slate-200 px-6 py-5 text-left">
              <DialogTitle className="text-lg">Add members</DialogTitle>
              <DialogDescription>Select people in your workspace to add to this team.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap gap-2">
                  {selectedUserIds.length === 0 ? (
                    <div className="text-sm text-slate-500">No one selected yet.</div>
                  ) : (
                    selectedUserIds.map((id) => {
                      const cand = candidates.find((c) => c.user_id === id)
                      const name = String(cand?.profiles?.full_name ?? 'Unknown')
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                        >
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="bg-white text-[10px] text-slate-600">{initials(name)}</AvatarFallback>
                          </Avatar>
                          <span className="max-w-[180px] truncate">{name}</span>
                          <button
                            type="button"
                            className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-500 hover:text-slate-700"
                            onClick={() => setSelectedUserIds((cur) => cur.filter((x) => x !== id))}
                            aria-label={`Remove ${name}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={addQuery} onChange={(e) => setAddQuery(e.target.value)} placeholder="Search name or email" className="pl-9" />
              </div>

              {filteredCandidates.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  {filteredCandidates.map((c) => {
                    const name = String(c.profiles?.full_name ?? 'Unknown')
                    const email = String(c.profiles?.email ?? '—')
                    return (
                      <button
                        key={c.user_id}
                        type="button"
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
                        onClick={() => setSelectedUserIds((cur) => (cur.includes(c.user_id) ? cur : [...cur, c.user_id]))}
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-slate-100 text-xs text-slate-700">{initials(name)}</AvatarFallback>
                        </Avatar>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-slate-900">{name}</span>
                          <span className="block truncate text-xs text-slate-500">{email}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="text-sm text-slate-500">No matching workspace members.</div>
              )}

              {error ? <div className="text-sm text-red-600">{error}</div> : null}
            </div>

            <DialogFooter className="border-t border-slate-200 px-6 py-5">
              <Button
                className="w-full bg-blue-600 text-white hover:bg-blue-700"
                disabled={selectedUserIds.length === 0 || isSubmitting}
                onClick={handleAddMembers}
              >
                {isSubmitting ? 'Adding…' : 'Add to team'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg text-gray-900">Members</CardTitle>
          <CardDescription>People who belong to this team.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="py-6 text-center text-sm text-gray-500">Loading members…</div>
          ) : members.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500">No members yet.</div>
          ) : (
            members.map((m) => {
              const name = String(m.profiles?.full_name ?? 'Unknown User')
              const email = String(m.profiles?.email ?? '—')
              return (
                <div
                  key={m.user_id}
                  className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-slate-100 text-xs text-slate-700">{initials(name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-gray-900">{name}</div>
                        <div className="truncate text-sm text-gray-500">{email}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="text-xs font-medium text-gray-500">{m.team_role === 'lead' ? 'Lead' : 'Member'}</div>
                    <Button variant="outline" className="h-9" onClick={() => handleRemove(m.user_id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}


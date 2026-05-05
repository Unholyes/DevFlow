import { useEffect, useState } from 'react'
type OrgState = {
  name: string | null
  icon: string | null
  loading: boolean
}

async function fetchOrgDataOnce(): Promise<{ name: string | null; icon: string | null }> {
  const res = await fetch('/api/me/organization', { credentials: 'include' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { name: null, icon: null }
  return {
    name: (data?.name as string | null) ?? null,
    icon: (data?.icon as string | null) ?? null
  }
}

export function useOrganizationName(): OrgState {
  const [state, setState] = useState<OrgState>({
    name: null,
    icon: null,
    loading: true,
  })

  useEffect(() => {
    let alive = true

    const run = async () => {
      // Retry a few times in case org was just created/approved.
      // This avoids “sticky” null when the header/sidebar mount
      // before the org exists.
      const maxAttempts = 3
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const data = await fetchOrgDataOnce()
        if (!alive) return

        if (data.name) {
          setState({ name: data.name, icon: data.icon, loading: false })
          return
        }

        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 800))
        }
      }

      if (!alive) return
      setState({ name: null, icon: null, loading: false })
    }

    run()

    return () => {
      alive = false
    }
  }, [])

  return state
}


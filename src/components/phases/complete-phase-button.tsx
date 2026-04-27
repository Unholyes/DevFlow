'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function CompletePhaseButton(props: { phaseId: string; disabled: boolean; reason?: string }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const onComplete = async () => {
    if (props.disabled) return
    setSaving(true)
    try {
      const res = await fetch('/api/phases', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: props.phaseId, status: 'completed' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to complete phase')
      router.refresh()
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Failed to complete phase')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Button
        className="bg-green-600 hover:bg-green-700"
        onClick={onComplete}
        disabled={props.disabled || saving}
        title={props.reason || undefined}
      >
        {saving ? 'Completing…' : 'Complete Phase'}
      </Button>
      {props.disabled && props.reason ? <div className="mt-1 text-xs text-gray-500">{props.reason}</div> : null}
    </div>
  )
}


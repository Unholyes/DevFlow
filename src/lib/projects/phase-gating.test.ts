import { describe, expect, it } from 'vitest'
import {
  isPhaseCompleteForGating,
  isPhaseLockedByGating,
  type PhaseGatingSnapshot,
} from './phase-gating'

function phase(
  overrides: Partial<PhaseGatingSnapshot> & Pick<PhaseGatingSnapshot, 'id'>
): PhaseGatingSnapshot {
  return {
    status: 'active',
    isGated: true,
    progress: 0,
    ...overrides,
  }
}

describe('isPhaseCompleteForGating', () => {
  it('requires gate approval and 100% timeline progress', () => {
    expect(isPhaseCompleteForGating(phase({ id: 'a', status: 'completed', progress: 100 }))).toBe(true)
    expect(isPhaseCompleteForGating(phase({ id: 'a', status: 'completed', progress: 67 }))).toBe(false)
    expect(isPhaseCompleteForGating(phase({ id: 'a', status: 'active', progress: 100 }))).toBe(false)
  })
})

describe('isPhaseLockedByGating', () => {
  const phases: PhaseGatingSnapshot[] = [
    phase({ id: 'req', status: 'completed', progress: 67 }),
    phase({ id: 'design', status: 'completed', progress: 100 }),
    phase({ id: 'dev', status: 'active', progress: 0 }),
  ]

  it('locks downstream phases when an earlier gated phase is incomplete', () => {
    expect(isPhaseLockedByGating(0, phases, true)).toBe(false)
    expect(isPhaseLockedByGating(1, phases, true)).toBe(true)
    expect(isPhaseLockedByGating(2, phases, true)).toBe(true)
  })

  it('does not lock when gating is disabled', () => {
    expect(isPhaseLockedByGating(2, phases, false)).toBe(false)
  })

  it('unlocks the next phase only after the full prior chain is complete', () => {
    const ready: PhaseGatingSnapshot[] = [
      phase({ id: 'req', status: 'completed', progress: 100 }),
      phase({ id: 'design', status: 'active', progress: 0 }),
    ]
    expect(isPhaseLockedByGating(1, ready, true)).toBe(false)
  })
})

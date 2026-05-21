export type PhaseGatingSnapshot = {
  id: string
  status: 'active' | 'completed' | 'archived'
  isGated: boolean
  progress: number
}

/**
 * A prior phase is satisfied for waterfall gating when it was gate-approved
 * and all phase tasks are done (timeline % is 100).
 */
export function isPhaseCompleteForGating(phase: PhaseGatingSnapshot): boolean {
  return phase.status === 'completed' && phase.progress >= 100
}

/**
 * Returns true when phase gating is on and any earlier gated phase is not fully complete.
 */
export function isPhaseLockedByGating(
  phaseIndex: number,
  phases: PhaseGatingSnapshot[],
  phaseGatingEnabled: boolean
): boolean {
  if (!phaseGatingEnabled) return false

  const phase = phases[phaseIndex]
  if (!phase?.isGated) return false
  if (phaseIndex <= 0) return false

  for (let i = 0; i < phaseIndex; i++) {
    const prior = phases[i]
    if (prior?.isGated && !isPhaseCompleteForGating(prior)) {
      return true
    }
  }

  return false
}

export function isPhaseLockedForProject(
  phases: PhaseGatingSnapshot[],
  phaseGatingEnabled: boolean,
  phaseId: string
): boolean {
  const phaseIndex = phases.findIndex((p) => p.id === phaseId)
  if (phaseIndex < 0) return false
  return isPhaseLockedByGating(phaseIndex, phases, phaseGatingEnabled)
}

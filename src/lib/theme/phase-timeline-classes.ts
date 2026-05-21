export type PhaseTimelineState = 'completed' | 'active' | 'locked'

export function phaseTimelineCardClass(state: PhaseTimelineState, locked: boolean) {
  const base = 'phase-timeline-card group relative p-4 rounded-lg border-2 transition-all'
  if (locked) {
    return `${base} phase-timeline-card--locked bg-gray-50 border-gray-200`
  }
  if (state === 'completed') {
    return `${base} phase-timeline-card--completed bg-green-50 border-green-200`
  }
  return `${base} phase-timeline-card--active bg-blue-50 border-blue-200`
}

export function phaseTimelineStatusTextClass(state: PhaseTimelineState, locked: boolean) {
  if (locked) return 'text-gray-500'
  if (state === 'completed') return 'text-green-700'
  return 'text-blue-700'
}

export function phaseTimelineProgressBarClass(state: PhaseTimelineState, locked: boolean) {
  if (locked) return 'bg-gray-300'
  if (state === 'completed') return 'bg-green-500'
  return 'bg-blue-600'
}

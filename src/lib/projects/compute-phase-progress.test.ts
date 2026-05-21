import { describe, expect, it } from 'vitest'
import { computePhaseProgressPercent } from './compute-phase-progress'

describe('computePhaseProgressPercent', () => {
  const stageIdToPhaseId = new Map([
    ['s1', 'phase-a'],
    ['s2', 'phase-a'],
    ['s3', 'phase-b'],
  ])
  const doneStageIds = new Set(['s2'])

  it('returns % of done tasks in the phase', () => {
    const progress = computePhaseProgressPercent({
      phaseId: 'phase-a',
      phaseStatus: 'active',
      tasks: [
        { workflow_stage_id: 's1', completed_at: null, process_id: null },
        { workflow_stage_id: 's2', completed_at: null, process_id: null },
        { workflow_stage_id: 's1', completed_at: '2026-01-01', process_id: null },
      ],
      stageIdToPhaseId,
      doneStageIds,
    })
    expect(progress).toBe(67)
  })

  it('counts is_done stages as completed', () => {
    const progress = computePhaseProgressPercent({
      phaseId: 'phase-a',
      phaseStatus: 'active',
      tasks: [
        { workflow_stage_id: 's1', completed_at: null, process_id: null },
        { workflow_stage_id: 's2', completed_at: null, process_id: null },
      ],
      stageIdToPhaseId,
      doneStageIds,
    })
    expect(progress).toBe(50)
  })

  it('returns 100 for completed phases with no tasks', () => {
    expect(
      computePhaseProgressPercent({
        phaseId: 'phase-a',
        phaseStatus: 'completed',
        tasks: [],
        stageIdToPhaseId,
        doneStageIds,
      })
    ).toBe(100)
  })

  it('returns 0 for active phases with no tasks', () => {
    expect(
      computePhaseProgressPercent({
        phaseId: 'phase-a',
        phaseStatus: 'active',
        tasks: [],
        stageIdToPhaseId,
        doneStageIds,
      })
    ).toBe(0)
  })
})

/** WIP limits apply to active flow columns only — not backlog or done/complete terminals. */

export type WipPolicyStage = {
  is_backlog?: boolean
  is_done?: boolean
}

export function wipAppliesToStage(stage: WipPolicyStage | null | undefined): boolean {
  if (stage == null) return false
  return !stage.is_backlog && !stage.is_done
}

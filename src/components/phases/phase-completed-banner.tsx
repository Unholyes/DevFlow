export function PhaseCompletedBanner() {
  return (
    <div
      className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      role="status"
    >
      This phase is <span className="font-semibold">completed</span>. You can review work here, but you
      cannot add tasks or create new sprints.
    </div>
  )
}

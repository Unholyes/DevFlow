import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { SPRINT_CARRYOVER_PLAN_NEW } from '@/lib/sprints/sprint-carryover';

interface SprintCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: {
    retrospective: { wentWell: string; improve: string; actionItems: string };
    unfinishedAction: 'backlog' | 'next_sprint';
    carryoverTargetSprintId?: string | null;
    deferCarryoverToPlan?: boolean;
  }) => void | Promise<void>;
  carryoverDraftSprints?: Array<{ id: string; name: string; story_points_total: number }>;
  sprintCapacityPoints?: number;
  sprintData: {
    name: string;
    totalPoints: number;
    completedPoints: number;
    unfinishedTasks: Array<{
      id: string;
      title: string;
      storyPoints: number;
    }>;
  };
}

export function SprintCompletionModal({
  isOpen,
  onClose,
  onComplete,
  sprintData,
  carryoverDraftSprints = [],
  sprintCapacityPoints,
}: SprintCompletionModalProps) {
  const [wentWell, setWentWell] = useState('');
  const [improve, setImprove] = useState('');
  const [actionItems, setActionItems] = useState('');
  const [unfinishedAction, setUnfinishedAction] = useState<'backlog' | 'next_sprint'>('backlog');
  const [carryoverTarget, setCarryoverTarget] = useState('');
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const completionRate =
    sprintData.totalPoints > 0
      ? Math.round((sprintData.completedPoints / sprintData.totalPoints) * 100)
      : sprintData.completedPoints > 0
        ? 100
        : 0;
  const unfinishedCount = sprintData.unfinishedTasks.length;
  const unfinishedPoints = sprintData.unfinishedTasks.reduce((sum, t) => sum + t.storyPoints, 0);

  const selectedDraft = carryoverDraftSprints.find((s) => s.id === carryoverTarget);
  const capacity = sprintCapacityPoints && sprintCapacityPoints > 0 ? sprintCapacityPoints : null;
  const projectedPoints =
    carryoverTarget && carryoverTarget !== SPRINT_CARRYOVER_PLAN_NEW && selectedDraft
      ? (selectedDraft.story_points_total || 0) + unfinishedPoints
      : null;
  const overCapacity =
    capacity != null && projectedPoints != null && projectedPoints > capacity;

  const carryoverTargetLabel = useMemo(() => {
    if (unfinishedAction !== 'next_sprint') return null;
    if (carryoverTarget === SPRINT_CARRYOVER_PLAN_NEW) return 'Plan a new sprint (Create Sprint)';
    if (selectedDraft) {
      return `${selectedDraft.name} (draft, ${selectedDraft.story_points_total} pts planned)`;
    }
    return null;
  }, [unfinishedAction, carryoverTarget, selectedDraft]);

  const carryoverSelectionError =
    unfinishedAction === 'next_sprint' && unfinishedCount > 0 && !carryoverTarget.trim()
      ? 'Select a sprint draft or "Plan a new sprint"'
      : null;

  const resetForm = () => {
    setStep(1);
    setWentWell('');
    setImprove('');
    setActionItems('');
    setUnfinishedAction('backlog');
    setCarryoverTarget('');
  };

  const handleComplete = async () => {
    if (carryoverSelectionError) return;
    setSubmitting(true);
    try {
      const deferCarryoverToPlan =
        unfinishedAction === 'next_sprint' && carryoverTarget === SPRINT_CARRYOVER_PLAN_NEW;
      const targetSprintId =
        unfinishedAction === 'next_sprint' && carryoverTarget && !deferCarryoverToPlan
          ? carryoverTarget
          : null;

      await onComplete({
        retrospective: { wentWell, improve, actionItems },
        unfinishedAction,
        carryoverTargetSprintId: targetSprintId,
        deferCarryoverToPlan,
      });
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !submitting) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {step === 1 ? 'Complete Sprint' : 'Sprint Summary'}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-6 py-4">
            {/* Sprint Summary */}
            <Card className="border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{sprintData.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Points</p>
                    <p className="text-2xl font-bold text-gray-900">{sprintData.totalPoints}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{sprintData.completedPoints}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Completion</p>
                    <p className="text-2xl font-bold text-gray-900">{completionRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Unfinished Tasks */}
            {unfinishedCount > 0 && (
              <Card className="border-yellow-200 bg-yellow-50/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <CardTitle className="text-lg text-yellow-800">Unfinished Tasks</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-yellow-700 mb-4">
                    {unfinishedCount} tasks ({unfinishedPoints} points) were not completed
                  </p>
                  <div className="space-y-2 mb-4">
                    {sprintData.unfinishedTasks.map((task) => (
                      <div key={task.id} className="flex justify-between items-center p-2 bg-white rounded border border-yellow-200">
                        <span className="text-sm text-gray-900">{task.title}</span>
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                          {task.storyPoints} pts
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      What should happen to unfinished tasks?
                    </label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setUnfinishedAction('backlog')}
                        className={`flex-1 p-3 rounded-lg border-2 text-left transition-colors ${
                          unfinishedAction === 'backlog'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-gray-900">Return to Backlog</div>
                        <div className="text-xs text-gray-600 mt-1">Tasks go back to product backlog</div>
                      </button>
                      <button
                        onClick={() => {
                          setUnfinishedAction('next_sprint');
                          if (!carryoverTarget) {
                            setCarryoverTarget(SPRINT_CARRYOVER_PLAN_NEW);
                          }
                        }}
                        className={`flex-1 p-3 rounded-lg border-2 text-left transition-colors ${
                          unfinishedAction === 'next_sprint'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-gray-900">Add to next sprint</div>
                        <div className="text-xs text-gray-600 mt-1">
                          Choose a Create Sprint draft or plan a new sprint — not the upcoming
                          scheduled sprint
                        </div>
                      </button>
                    </div>
                    {unfinishedAction === 'next_sprint' ? (
                      <div className="mt-4 space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Target sprint
                        </label>
                        <Select value={carryoverTarget} onValueChange={setCarryoverTarget}>
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select sprint…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={SPRINT_CARRYOVER_PLAN_NEW}>
                              Plan a new sprint (Create Sprint) — recommended
                            </SelectItem>
                            {carryoverDraftSprints.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name} (draft · {s.story_points_total} pts)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {carryoverSelectionError ? (
                          <p className="text-xs text-red-600">{carryoverSelectionError}</p>
                        ) : null}
                        {overCapacity ? (
                          <p className="text-xs text-amber-700">
                            Adding {unfinishedPoints} pts would bring this draft to {projectedPoints}{' '}
                            pts (capacity {capacity}). Adjust tasks on the plan page after carryover.
                          </p>
                        ) : null}
                        {carryoverDraftSprints.length === 0 ? (
                          <p className="text-xs text-gray-600">
                            No saved sprint drafts yet. Use &quot;Plan a new sprint&quot; to open Create
                            Sprint with these tasks pre-selected.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Retrospective */}
            <Card className="border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Sprint Retrospective</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      What went well?
                    </label>
                    <Textarea
                      placeholder="Share successes and positive outcomes..."
                      className="min-h-[80px]"
                      value={wentWell}
                      onChange={(e) => setWentWell(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      What could be improved?
                    </label>
                    <Textarea
                      placeholder="Share challenges and areas for improvement..."
                      className="min-h-[80px]"
                      value={improve}
                      onChange={(e) => setImprove(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Action items for next sprint
                    </label>
                    <Textarea
                      placeholder="List specific actions to take..."
                      className="min-h-[80px]"
                      value={actionItems}
                      onChange={(e) => setActionItems(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Final Summary */}
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to complete</h3>
              <p className="text-gray-600">
                Confirm to close {sprintData.name} and apply your choices for unfinished work.
              </p>
            </div>

            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Story Points Completed</span>
                  <span className="font-semibold text-gray-900">{sprintData.completedPoints} / {sprintData.totalPoints}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completion Rate</span>
                  <span className="font-semibold text-gray-900">{completionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Unfinished Tasks</span>
                  <span className="font-semibold text-gray-900">{unfinishedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Unfinished Action</span>
                  <span className="font-semibold text-gray-900">
                    {unfinishedAction === 'backlog' ? 'Return to Backlog' : 'Add to next sprint'}
                  </span>
                </div>
                {carryoverTargetLabel ? (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600 shrink-0">Target</span>
                    <span className="font-semibold text-gray-900 text-right">{carryoverTargetLabel}</span>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/30">
              <CardContent className="p-4">
                <p className="text-sm text-blue-800">
                  <strong>Next Steps:</strong> You can now create a new sprint and start planning your next iteration.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={() => setStep(2)} disabled={Boolean(carryoverSelectionError)}>
                Review Summary
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)} disabled={submitting}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => void handleComplete()}
                className="bg-green-600 hover:bg-green-700"
                disabled={submitting || Boolean(carryoverSelectionError)}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {submitting ? 'Completing…' : 'Complete Sprint'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

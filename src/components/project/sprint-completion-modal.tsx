import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

interface SprintCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: { retrospective: string; unfinishedAction: 'backlog' | 'next_sprint' }) => void;
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

export function SprintCompletionModal({ isOpen, onClose, onComplete, sprintData }: SprintCompletionModalProps) {
  const [retrospective, setRetrospective] = useState('');
  const [unfinishedAction, setUnfinishedAction] = useState<'backlog' | 'next_sprint'>('backlog');
  const [step, setStep] = useState(1);

  const completionRate = Math.round((sprintData.completedPoints / sprintData.totalPoints) * 100);
  const unfinishedCount = sprintData.unfinishedTasks.length;
  const unfinishedPoints = sprintData.unfinishedTasks.reduce((sum, t) => sum + t.storyPoints, 0);

  const handleComplete = () => {
    onComplete({ retrospective, unfinishedAction });
    setStep(1);
    setRetrospective('');
    setUnfinishedAction('backlog');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
                        onClick={() => setUnfinishedAction('next_sprint')}
                        className={`flex-1 p-3 rounded-lg border-2 text-left transition-colors ${
                          unfinishedAction === 'next_sprint'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-gray-900">Add to Next Sprint</div>
                        <div className="text-xs text-gray-600 mt-1">Tasks included in next sprint</div>
                      </button>
                    </div>
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
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      What could be improved?
                    </label>
                    <Textarea
                      placeholder="Share challenges and areas for improvement..."
                      className="min-h-[80px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Action items for next sprint
                    </label>
                    <Textarea
                      placeholder="List specific actions to take..."
                      className="min-h-[80px]"
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
              <h3 className="text-xl font-bold text-gray-900 mb-2">Sprint Completed!</h3>
              <p className="text-gray-600">
                {sprintData.name} has been archived
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
                    {unfinishedAction === 'backlog' ? 'Return to Backlog' : 'Add to Next Sprint'}
                  </span>
                </div>
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
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={() => setStep(2)}>
                Review Summary
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete Sprint
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

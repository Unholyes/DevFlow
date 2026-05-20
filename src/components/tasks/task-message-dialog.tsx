'use client'

import { AlertCircle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DUPLICATE_TASK_TITLE_IN_PROCESS } from '@/lib/tasks/validate-task-title'
import { cn } from '@/lib/utils'

export type TaskMessageDialogVariant = 'error' | 'info'

export function taskErrorDialogFromMessage(message: string): { title: string; message: string } {
  if (message === DUPLICATE_TASK_TITLE_IN_PROCESS || message.includes('already exists in this process')) {
    return {
      title: 'Duplicate task name',
      message,
    }
  }
  return {
    title: 'Something went wrong',
    message,
  }
}

export function taskErrorDialogFromUnknown(error: unknown, fallback = 'Something went wrong. Please try again.'): {
  title: string
  message: string
} {
  const message = error instanceof Error ? error.message : fallback
  return taskErrorDialogFromMessage(message)
}

export function TaskMessageDialog({
  open,
  onOpenChange,
  title,
  message,
  variant = 'error',
  confirmLabel = 'OK',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  variant?: TaskMessageDialogVariant
  confirmLabel?: string
}) {
  const isError = variant === 'error'
  const Icon = isError ? AlertCircle : Info

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                isError ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600',
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <div className="space-y-1.5 text-left">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="text-gray-600">{message}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            className={cn(isError ? 'bg-gray-900 hover:bg-gray-800' : 'bg-blue-600 hover:bg-blue-700')}
            onClick={() => onOpenChange(false)}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

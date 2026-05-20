'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import Stepper, { Step } from '@/components/react-bits/Stepper/Stepper'

const organizationApplicationSchema = z.object({
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  contactEmail: z.string().email('Please enter a valid email address'),
  phoneNumber: z.string().optional(),
  websiteUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  industry: z.string().optional(),
  expectedTeamSize: z.string().optional(),
  useCase: z.string().min(20, 'Use case must be at least 20 characters'),
})

type OrganizationApplicationFormData = z.infer<typeof organizationApplicationSchema>

const industries = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Manufacturing',
  'Retail',
  'Consulting',
  'Media',
  'Government',
  'Other',
]

const teamSizes = [
  '1-10',
  '11-50',
  '51-100',
  '101-500',
  '500+',
]

interface CreateOrganizationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userEmail?: string
  onSubmitted?: () => void
}

export function CreateOrganizationModal({
  open,
  onOpenChange,
  userEmail,
  onSubmitted,
}: CreateOrganizationModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showError, setShowError] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const [currentStep, setCurrentStep] = useState(1)
  const [isCheckingName, setIsCheckingName] = useState(false)
  const [isNameDuplicate, setIsNameDuplicate] = useState(false)
  const [duplicateMessage, setDuplicateMessage] = useState<string | null>(null)

  const {
    register,
    formState: { errors },
    reset,
    trigger,
    getValues,
    watch,
  } = useForm<OrganizationApplicationFormData>({
    resolver: zodResolver(organizationApplicationSchema),
    defaultValues: {
      contactEmail: userEmail || '',
    },
  })

  const organizationName = watch('organizationName')

  useEffect(() => {
    if (!organizationName || organizationName.trim().length < 2) {
      setIsNameDuplicate(false)
      setDuplicateMessage(null)
      return
    }

    const trimmed = organizationName.trim()
    const delayDebounceFn = setTimeout(async () => {
      setIsCheckingName(true)
      try {
        const res = await fetch(`/api/organization-applications/check-name?name=${encodeURIComponent(trimmed)}`)
        const data = await res.json()
        if (data.exists) {
          setIsNameDuplicate(true)
          setDuplicateMessage(
            data.type === 'organization'
              ? `An organization named "${data.name}" already exists.`
              : `An organization application for "${data.name}" is already pending or approved.`
          )
        } else {
          setIsNameDuplicate(false)
          setDuplicateMessage(null)
        }
      } catch (err) {
        console.error('Error checking organization name uniqueness:', err)
      } finally {
        setIsCheckingName(false)
      }
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [organizationName])

  const submitApplication = async (data: OrganizationApplicationFormData): Promise<boolean> => {
    setIsLoading(true)
    setErrorMessage(null)
    setShowError(false)

    try {
      const response = await fetch('/api/organization-applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        setErrorMessage(result.error || 'Failed to submit application')
        setShowError(true)
        return false
      }

      reset()
      setShowSuccess(true)
      onSubmitted?.()
      return true
    } catch {
      setErrorMessage('An unexpected error occurred')
      setShowError(true)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const onInvalid = () => {
    setErrorMessage('Please fill out all required fields before submitting.')
    setShowError(true)
  }

  const handleDialogOpenChange = (nextOpen: boolean) => {
    // Only reset local state when the main dialog is actually closing.
    if (!nextOpen) {
      reset()
      setErrorMessage(null)
      setShowError(false)
      setIsCheckingName(false)
      setIsNameDuplicate(false)
      setDuplicateMessage(null)
      setCurrentStep(1)
    }
    onOpenChange(nextOpen)
  }

  const handleSuccessClose = () => {
    setShowSuccess(false)
    onOpenChange(false)
  }

  const handleErrorClose = () => {
    setShowError(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="flex h-[min(90vh,920px)] max-h-[92vh] w-[min(100vw-1.5rem,56rem)] max-w-none flex-col gap-3 overflow-hidden p-6 sm:max-w-4xl">
          <DialogHeader className="shrink-0 space-y-1.5 pr-10 text-left">
            <DialogTitle>Create Organization Application</DialogTitle>
            <DialogDescription>
              Submit your organization application for review. Once approved, you&apos;ll be able to create and manage your workspace.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => e.preventDefault()} className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="min-h-0 flex-1 basis-0">
              <div className="h-full">
                <Stepper
                  initialStep={1}
                  onStepChange={setCurrentStep}
                  onFinalStepCompleted={async () => {
                    const valid = await trigger()
                    if (!valid) {
                      onInvalid()
                      return false
                    }
                    return await submitApplication(getValues())
                  }}
                  disableStepIndicators={false}
                  uniformContentHeight
                  className="rb-stepper__outer-container--modal"
                  contentClassName="rb-stepper__content--modal"
                  backButtonText="Previous"
                  nextButtonText="Next"
                  completeButtonText={isLoading ? 'Submitting…' : 'Submit'}
                  nextButtonProps={{
                    disabled:
                      isLoading ||
                      isCheckingName ||
                      (currentStep === 1 && (!organizationName?.trim() || isNameDuplicate || isCheckingName)),
                  }}
                >
                  <Step>
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Basics</h3>
                        <p className="mt-1 text-sm text-gray-600">
                          Tell us what your organization is called and where we can learn more.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="organizationName">Organization Name *</Label>
                        <Input
                          id="organizationName"
                          placeholder="Your Company Name"
                          {...register('organizationName')}
                          className={cn(
                            "transition-all duration-200",
                            isNameDuplicate ? "border-red-500 ring-2 ring-red-100 focus-visible:ring-red-500 focus-visible:border-red-500" : ""
                          )}
                        />
                        {isCheckingName && (
                          <p className="mt-1.5 text-sm text-gray-500 flex items-center gap-1.5 animate-in fade-in duration-200">
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-purple-600" />
                            Checking availability...
                          </p>
                        )}
                        {isNameDuplicate && duplicateMessage && (
                          <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                            <AlertCircle className="h-4 w-4" />
                            {duplicateMessage}
                          </p>
                        )}
                        {!isNameDuplicate && !isCheckingName && errors.organizationName && (
                          <p className="text-sm text-red-600">{errors.organizationName.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="websiteUrl">Website URL (Optional)</Label>
                        <Input
                          id="websiteUrl"
                          type="url"
                          placeholder="https://www.yourcompany.com"
                          {...register('websiteUrl')}
                        />
                        {errors.websiteUrl && <p className="text-sm text-red-600">{errors.websiteUrl.message}</p>}
                      </div>
                    </div>
                  </Step>

                  <Step>
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Contact</h3>
                        <p className="mt-1 text-sm text-gray-600">We’ll use this for review follow-ups.</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contactEmail">Contact Email *</Label>
                        <Input id="contactEmail" type="email" placeholder="contact@company.com" {...register('contactEmail')} />
                        {errors.contactEmail && <p className="text-sm text-red-600">{errors.contactEmail.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
                        <Input id="phoneNumber" type="tel" placeholder="+1 (555) 000-0000" {...register('phoneNumber')} />
                        {errors.phoneNumber && <p className="text-sm text-red-600">{errors.phoneNumber.message}</p>}
                      </div>
                    </div>
                  </Step>

                  <Step>
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Profile</h3>
                        <p className="mt-1 text-sm text-gray-600">Optional details help us tailor the workspace defaults.</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="industry">Industry (Optional)</Label>
                        <select
                          id="industry"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          {...register('industry')}
                        >
                          <option value="">Select an industry</option>
                          {industries.map((industry) => (
                            <option key={industry} value={industry}>
                              {industry}
                            </option>
                          ))}
                        </select>
                        {errors.industry && <p className="text-sm text-red-600">{errors.industry.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="expectedTeamSize">Expected Team Size (Optional)</Label>
                        <select
                          id="expectedTeamSize"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          {...register('expectedTeamSize')}
                        >
                          <option value="">Select team size</option>
                          {teamSizes.map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                        {errors.expectedTeamSize && (
                          <p className="text-sm text-red-600">{errors.expectedTeamSize.message}</p>
                        )}
                      </div>
                    </div>
                  </Step>

                  <Step>
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Why DevFlow?</h3>
                        <p className="mt-1 text-sm text-gray-600">
                          Help us understand your organization and what you’re building.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Organization Description *</Label>
                        <Textarea
                          id="description"
                          placeholder="Describe your organization's mission and purpose"
                          rows={4}
                          {...register('description')}
                        />
                        {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="useCase">Use Case Description *</Label>
                        <Textarea
                          id="useCase"
                          placeholder="How do you plan to use DevFlow? Describe your use case and requirements."
                          rows={5}
                          {...register('useCase')}
                        />
                        {errors.useCase && <p className="text-sm text-red-600">{errors.useCase.message}</p>}
                      </div>
                    </div>
                  </Step>
                </Stepper>
              </div>
            </div>

            <DialogFooter className="mt-auto shrink-0 gap-2 pt-1 sm:pt-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccess} onOpenChange={handleSuccessClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Application submitted
            </DialogTitle>
            <DialogDescription>
              Your organization application has been submitted for review. You can track its status on your dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleSuccessClose}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showError} onOpenChange={handleErrorClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unable to submit</DialogTitle>
            <DialogDescription>{errorMessage ?? 'Please check the form and try again.'}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleErrorClose}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

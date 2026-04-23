'use client'

import { useState } from 'react'
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
import { CheckCircle2 } from 'lucide-react'

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
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<OrganizationApplicationFormData>({
    resolver: zodResolver(organizationApplicationSchema),
    defaultValues: {
      contactEmail: userEmail || '',
    },
  })

  const onSubmit = async (data: OrganizationApplicationFormData) => {
    setIsLoading(true)
    setError(null)

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
        setError(result.error || 'Failed to submit application')
        return
      }

      reset()
      onOpenChange(false)
      setShowSuccess(true)
      onSubmitted?.()
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    reset()
    setError(null)
    onOpenChange(false)
  }

  const handleSuccessClose = () => {
    setShowSuccess(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Organization Application</DialogTitle>
            <DialogDescription>
              Submit your organization application for review. Once approved, you'll be able to create and manage your workspace.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
            {/* Organization Name */}
            <div className="space-y-2">
              <Label htmlFor="organizationName">Organization Name *</Label>
              <Input
                id="organizationName"
                placeholder="Your Company Name"
                {...register('organizationName')}
              />
              {errors.organizationName && (
                <p className="text-sm text-red-600">{errors.organizationName.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Organization Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe your organization's mission and purpose"
                rows={3}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* Contact Email */}
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email *</Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="contact@company.com"
                {...register('contactEmail')}
              />
              {errors.contactEmail && (
                <p className="text-sm text-red-600">{errors.contactEmail.message}</p>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="+1 (555) 000-0000"
                {...register('phoneNumber')}
              />
              {errors.phoneNumber && (
                <p className="text-sm text-red-600">{errors.phoneNumber.message}</p>
              )}
            </div>

            {/* Website URL */}
            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website URL (Optional)</Label>
              <Input
                id="websiteUrl"
                type="url"
                placeholder="https://www.yourcompany.com"
                {...register('websiteUrl')}
              />
              {errors.websiteUrl && (
                <p className="text-sm text-red-600">{errors.websiteUrl.message}</p>
              )}
            </div>

            {/* Industry */}
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
              {errors.industry && (
                <p className="text-sm text-red-600">{errors.industry.message}</p>
              )}
            </div>

            {/* Expected Team Size */}
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

            {/* Use Case */}
            <div className="space-y-2">
              <Label htmlFor="useCase">Use Case Description *</Label>
              <Textarea
                id="useCase"
                placeholder="How do you plan to use DevFlow? Describe your use case and requirements."
                rows={4}
                {...register('useCase')}
              />
              {errors.useCase && (
                <p className="text-sm text-red-600">{errors.useCase.message}</p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Submitting...' : 'Submit Application'}
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
    </>
  )
}

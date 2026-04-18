'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Save, X } from 'lucide-react'

const organizationSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(100, "Organization name must be less than 100 characters"),
})

type OrganizationFormData = z.infer<typeof organizationSchema>

interface OrganizationFormProps {
  organization: any // Using any for now since we don't have strict typing
  updateOrganization: (formData: FormData) => Promise<{ success: boolean; error?: string }>
}

export function OrganizationForm({ organization, updateOrganization }: OrganizationFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: organization?.name || '',
    },
  })

  const onSubmit = async (data: OrganizationFormData) => {
    setIsLoading(true)
    setMessage(null)

    const formData = new FormData()
    formData.append('name', data.name)

    const result = await updateOrganization(formData)

    if (result.success) {
      setMessage({ type: 'success', text: 'Organization updated successfully!' })
      reset(data) // Reset form to mark as not dirty
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update organization' })
    }

    setIsLoading(false)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Organization Name Field */}
      <div className="space-y-2">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Organization Name
        </label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Enter organization name"
          className="w-full"
        />
        {errors.name && (
          <p className="text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Organization ID (Read-only) */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Organization ID
        </label>
        <Input
          value={organization?.id}
          disabled
          className="w-full bg-gray-50 font-mono text-sm"
        />
        <p className="text-xs text-gray-500">Unique identifier for your organization</p>
      </div>

      {/* Created Date (Read-only) */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Created
        </label>
        <Input
          value={organization?.created_at ? new Date(organization.created_at).toLocaleDateString() : 'Unknown'}
          disabled
          className="w-full bg-gray-50"
        />
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => reset()}
          disabled={!isDirty || isLoading}
        >
          <X className="h-4 w-4 mr-2" />
          Reset
        </Button>
        <Button
          type="submit"
          disabled={!isDirty || isLoading}
        >
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
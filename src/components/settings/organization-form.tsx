'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Save, X, Palette } from 'lucide-react'

const organizationSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(100, "Organization name must be less than 100 characters"),
  theme_preset: z.enum(['default', 'blue', 'green', 'purple', 'dark', 'custom']).optional(),
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  secondary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  accent_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
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
    control,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: organization?.name || '',
      theme_preset: organization?.theme_preset || 'default',
      primary_color: organization?.primary_color || '#3B82F6',
      secondary_color: organization?.secondary_color || '#64748B',
      accent_color: organization?.accent_color || '#10B981',
    },
  })

  const selectedThemePreset = watch('theme_preset')

  // Update colors when preset changes
  useEffect(() => {
    if (selectedThemePreset !== 'custom') {
      const presetColors = {
        default: { primary: '#3B82F6', secondary: '#64748B', accent: '#10B981' },
        blue: { primary: '#2563EB', secondary: '#64748B', accent: '#1D4ED8' },
        green: { primary: '#059669', secondary: '#64748B', accent: '#047857' },
        purple: { primary: '#7C3AED', secondary: '#64748B', accent: '#6D28D9' },
        dark: { primary: '#1F2937', secondary: '#374151', accent: '#111827' },
      }
      const colors = presetColors[selectedThemePreset as keyof typeof presetColors]
      if (colors) {
        setValue('primary_color', colors.primary, { shouldDirty: true })
        setValue('secondary_color', colors.secondary, { shouldDirty: true })
        setValue('accent_color', colors.accent, { shouldDirty: true })
      }
    }
  }, [selectedThemePreset, setValue])

  const onSubmit = async (data: OrganizationFormData) => {
    setIsLoading(true)
    setMessage(null)

    const formData = new FormData()
    formData.append('name', data.name)
    if (data.theme_preset) formData.append('theme_preset', data.theme_preset)
    if (data.primary_color) formData.append('primary_color', data.primary_color)
    if (data.secondary_color) formData.append('secondary_color', data.secondary_color)
    if (data.accent_color) formData.append('accent_color', data.accent_color)

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

      {/* Theme Settings */}
      <div className="border-t pt-6 mt-6">
        <div className="flex items-center mb-4">
          <Palette className="h-5 w-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Theme Customization</h3>
        </div>

        {/* Theme Preset */}
        <div className="space-y-2 mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Theme Preset
          </label>
          <Controller
            name="theme_preset"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select theme preset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default (Blue)</SelectItem>
                  <SelectItem value="blue">Blue Theme</SelectItem>
                  <SelectItem value="green">Green Theme</SelectItem>
                  <SelectItem value="purple">Purple Theme</SelectItem>
                  <SelectItem value="dark">Dark Theme</SelectItem>
                  <SelectItem value="custom">Custom Colors</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Custom Colors - Show when custom is selected */}
        {selectedThemePreset === 'custom' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Primary Color */}
              <div className="space-y-2">
                <label htmlFor="primary_color" className="block text-sm font-medium text-gray-700">
                  Primary Color
                </label>
                <div className="flex gap-2">
                  <Controller
                    name="primary_color"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="primary_color"
                        type="color"
                        value={field.value}
                        onChange={field.onChange}
                        className="w-16 h-10 p-1 border border-gray-300 rounded"
                      />
                    )}
                  />
                  <Controller
                    name="primary_color"
                    control={control}
                    render={({ field }) => (
                      <Input
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="#3B82F6"
                        className="flex-1"
                      />
                    )}
                  />
                </div>
                {errors.primary_color && (
                  <p className="text-sm text-red-600">{errors.primary_color.message}</p>
                )}
              </div>

              {/* Secondary Color */}
              <div className="space-y-2">
                <label htmlFor="secondary_color" className="block text-sm font-medium text-gray-700">
                  Secondary Color
                </label>
                <div className="flex gap-2">
                  <Controller
                    name="secondary_color"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="secondary_color"
                        type="color"
                        value={field.value}
                        onChange={field.onChange}
                        className="w-16 h-10 p-1 border border-gray-300 rounded"
                      />
                    )}
                  />
                  <Controller
                    name="secondary_color"
                    control={control}
                    render={({ field }) => (
                      <Input
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="#64748B"
                        className="flex-1"
                      />
                    )}
                  />
                </div>
                {errors.secondary_color && (
                  <p className="text-sm text-red-600">{errors.secondary_color.message}</p>
                )}
              </div>

              {/* Accent Color */}
              <div className="space-y-2">
                <label htmlFor="accent_color" className="block text-sm font-medium text-gray-700">
                  Accent Color
                </label>
                <div className="flex gap-2">
                  <Controller
                    name="accent_color"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="accent_color"
                        type="color"
                        value={field.value}
                        onChange={field.onChange}
                        className="w-16 h-10 p-1 border border-gray-300 rounded"
                      />
                    )}
                  />
                  <Controller
                    name="accent_color"
                    control={control}
                    render={({ field }) => (
                      <Input
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="#10B981"
                        className="flex-1"
                      />
                    )}
                  />
                </div>
                {errors.accent_color && (
                  <p className="text-sm text-red-600">{errors.accent_color.message}</p>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Choose custom colors for your organization's theme. These will be applied across the dashboard.
            </p>
          </div>
        )}

        {selectedThemePreset !== 'custom' && (
          <p className="text-sm text-gray-600">
            Select "Custom Colors" to specify your own color scheme.
          </p>
        )}
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
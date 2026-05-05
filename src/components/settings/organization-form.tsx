'use client'

import { useState, useEffect, type ChangeEvent } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Save, X, Palette, Camera } from 'lucide-react'

const organizationSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(100, "Organization name must be less than 100 characters"),
  theme_preset: z.enum(['default', 'blue', 'green', 'purple', 'dark', 'custom']).optional(),
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  secondary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  accent_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  background_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  surface_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  sidebar_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  border_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  text_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  muted_text_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
})

type OrganizationFormData = z.infer<typeof organizationSchema>

interface OrganizationFormProps {
  organization: any // Using any for now since we don't have strict typing
  updateOrganization: (formData: FormData) => Promise<{ success: boolean; error?: string }>
}

export function OrganizationForm({ organization, updateOrganization }: OrganizationFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedLogo, setSelectedLogo] = useState<File | null>(null)
  const [previewLogoUrl, setPreviewLogoUrl] = useState<string | null>(null)

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
      background_color: organization?.background_color || '#F8FAFC',
      surface_color: organization?.surface_color || '#FFFFFF',
      sidebar_color: organization?.sidebar_color || '#FFFFFF',
      border_color: organization?.border_color || '#E5E7EB',
      text_color: organization?.text_color || '#0F172A',
      muted_text_color: organization?.muted_text_color || '#475569',
    },
  })

  const selectedThemePreset = watch('theme_preset')

  // Update layout tokens when preset changes (only for non-custom presets)
  useEffect(() => {
    if (selectedThemePreset !== 'custom') {
      const presetTokens = {
        default: {
          background_color: '#F8FAFC',
          surface_color: '#FFFFFF',
          sidebar_color: '#FFFFFF',
          border_color: '#E5E7EB',
          text_color: '#0F172A',
          muted_text_color: '#475569',
        },
        blue: {
          background_color: '#F4F8FF',
          surface_color: '#FFFFFF',
          sidebar_color: '#FFFFFF',
          border_color: '#E5E7EB',
          text_color: '#0F172A',
          muted_text_color: '#475569',
        },
        green: {
          background_color: '#F4FBF8',
          surface_color: '#FFFFFF',
          sidebar_color: '#FFFFFF',
          border_color: '#E5E7EB',
          text_color: '#0F172A',
          muted_text_color: '#475569',
        },
        purple: {
          background_color: '#F7F5FF',
          surface_color: '#FFFFFF',
          sidebar_color: '#FFFFFF',
          border_color: '#E5E7EB',
          text_color: '#0F172A',
          muted_text_color: '#475569',
        },
        dark: {
          background_color: '#0B1220',
          surface_color: '#0F172A',
          sidebar_color: '#0F172A',
          border_color: '#1F2A3D',
          text_color: '#E5E7EB',
          muted_text_color: '#9CA3AF',
        },
      } as const

      const tokens = presetTokens[(selectedThemePreset || 'default') as keyof typeof presetTokens]
      setValue('background_color', tokens.background_color, { shouldDirty: true })
      setValue('surface_color', tokens.surface_color, { shouldDirty: true })
      setValue('sidebar_color', tokens.sidebar_color, { shouldDirty: true })
      setValue('border_color', tokens.border_color, { shouldDirty: true })
      setValue('text_color', tokens.text_color, { shouldDirty: true })
      setValue('muted_text_color', tokens.muted_text_color, { shouldDirty: true })
    }
  }, [selectedThemePreset, setValue])

  const onSubmit = async (data: OrganizationFormData) => {
    setIsLoading(true)
    setMessage(null)

    const formData = new FormData()
    formData.append('organization_id', String(organization?.id ?? ''))
    formData.append('name', data.name)
    if (data.theme_preset) formData.append('theme_preset', data.theme_preset)
    if (data.primary_color) formData.append('primary_color', data.primary_color)
    if (data.secondary_color) formData.append('secondary_color', data.secondary_color)
    if (data.accent_color) formData.append('accent_color', data.accent_color)
    if (data.background_color) formData.append('background_color', data.background_color)
    if (data.surface_color) formData.append('surface_color', data.surface_color)
    if (data.sidebar_color) formData.append('sidebar_color', data.sidebar_color)
    if (data.border_color) formData.append('border_color', data.border_color)
    if (data.text_color) formData.append('text_color', data.text_color)
    if (data.muted_text_color) formData.append('muted_text_color', data.muted_text_color)

    if (selectedLogo) {
      try {
        setIsUploadingLogo(true)

        const authResponse = await fetch('/api/imagekit/auth')
        if (!authResponse.ok) {
          throw new Error('Failed to authenticate logo upload')
        }

        const { token, expire, signature, publicKey } = await authResponse.json()

        const uploadFormData = new FormData()
        uploadFormData.append('file', selectedLogo)
        uploadFormData.append('fileName', `org-logo-${organization?.id ?? 'org'}-${Date.now()}`)
        uploadFormData.append('folder', '/devflow/org-logos')
        uploadFormData.append('token', token)
        uploadFormData.append('expire', String(expire))
        uploadFormData.append('signature', signature)
        uploadFormData.append('publicKey', publicKey)

        const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
          method: 'POST',
          body: uploadFormData,
        })

        if (!uploadResponse.ok) {
          throw new Error('Logo upload failed')
        }

        const uploadedAsset = await uploadResponse.json()
        if (!uploadedAsset?.url) throw new Error('Logo upload failed')

        formData.append('icon_url', uploadedAsset.url)
      } catch (error) {
        setMessage({
          type: 'error',
          text: error instanceof Error ? error.message : 'Failed to upload organization logo',
        })
        setIsLoading(false)
        setIsUploadingLogo(false)
        return
      } finally {
        setIsUploadingLogo(false)
      }
    }

    const result = await updateOrganization(formData)

    if (result.success) {
      setMessage({ type: 'success', text: 'Organization updated successfully!' })
      reset(data) // Reset form to mark as not dirty
      setSelectedLogo(null)
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update organization' })
    }

    setIsLoading(false)
  }

  const handleLogoSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    const isValidType = selectedFile.type.startsWith('image/')
    if (!isValidType) {
      setMessage({ type: 'error', text: 'Please select a valid image file' })
      return
    }

    const maxBytes = 5 * 1024 * 1024
    if (selectedFile.size > maxBytes) {
      setMessage({ type: 'error', text: 'Logo must be 5MB or smaller' })
      return
    }

    setMessage(null)
    setSelectedLogo(selectedFile)
    setPreviewLogoUrl(URL.createObjectURL(selectedFile))
  }

  const logoSrc = previewLogoUrl || organization?.icon_url || null

  const isSubmitDisabled = (!isDirty && !selectedLogo) || isLoading || isUploadingLogo

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Organization Logo */}
      <div className="flex items-center gap-6">
        <div className="h-20 w-20 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt="Organization logo" className="h-full w-full object-contain" />
          ) : (
            <div className="text-xs text-gray-500 text-center px-2">No logo</div>
          )}
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-900">Company logo</h3>
          <p className="text-sm text-gray-600">Upload a logo to show in the dashboard header.</p>
          <Button asChild variant="outline" size="sm" className="mt-2">
            <label htmlFor="org-logo-upload" className="cursor-pointer">
              <Camera className="h-4 w-4 mr-2" />
              {selectedLogo ? 'Logo Selected' : 'Upload Logo'}
            </label>
          </Button>
          <input
            id="org-logo-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoSelection}
          />
          <p className="text-xs text-gray-500 mt-1">JPG, PNG, or WebP up to 5MB</p>
        </div>
      </div>

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

            <div className="mt-4 border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-900">Surfaces & layout</h4>
              <p className="text-xs text-gray-500 mt-1">
                These control the dashboard background, cards/boxes, sidebar, and borders. Keep them subtle for a professional look.
              </p>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                {(
                  [
                    { key: 'background_color', label: 'Background', placeholder: '#F8FAFC' },
                    { key: 'surface_color', label: 'Boxes / Cards', placeholder: '#FFFFFF' },
                    { key: 'sidebar_color', label: 'Sidebar', placeholder: '#FFFFFF' },
                    { key: 'border_color', label: 'Borders', placeholder: '#E5E7EB' },
                    { key: 'text_color', label: 'Text', placeholder: '#0F172A' },
                    { key: 'muted_text_color', label: 'Muted text', placeholder: '#475569' },
                  ] as const
                ).map(({ key, label, placeholder }) => (
                  <div key={key} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">{label}</label>
                    <div className="flex gap-2">
                      <Controller
                        name={key}
                        control={control}
                        render={({ field }) => (
                          <Input
                            type="color"
                            value={field.value as any}
                            onChange={field.onChange}
                            className="w-16 h-10 p-1 border border-gray-300 rounded"
                          />
                        )}
                      />
                      <Controller
                        name={key}
                        control={control}
                        render={({ field }) => (
                          <Input
                            value={field.value as any}
                            onChange={field.onChange}
                            placeholder={placeholder}
                            className="flex-1"
                          />
                        )}
                      />
                    </div>
                    {(errors as any)?.[key] && (
                      <p className="text-sm text-red-600">{String((errors as any)[key]?.message ?? '')}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Tip: start by adjusting surfaces first (background/cards/sidebar), then tweak accents.
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
          onClick={() => {
            reset()
            setSelectedLogo(null)
            setPreviewLogoUrl(null)
          }}
          disabled={(!isDirty && !selectedLogo) || isLoading || isUploadingLogo}
        >
          <X className="h-4 w-4 mr-2" />
          Reset
        </Button>
        <Button
          type="submit"
          disabled={isSubmitDisabled}
        >
          <Save className="h-4 w-4 mr-2" />
          {isLoading
            ? 'Saving...'
            : isUploadingLogo
              ? 'Uploading Logo...'
              : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
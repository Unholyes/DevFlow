'use client'

import { useState, useEffect, type ChangeEvent } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Save, X, Palette, Camera } from 'lucide-react'
import {
  settingsFormHint,
  settingsFormLabel,
  settingsFormSectionTitle,
} from '@/lib/theme/settings-surface-classes'
import { applyPresetToFormValues, isBuiltInPreset } from '@/lib/theme/organization-theme-presets'
import { resolveOrganizationTheme } from '@/lib/theme/resolve-organization-theme'
import { normalizeHexColor } from '@/lib/theme/resolve-theme-tokens'

const hexColorField = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/i, 'Use format #RRGGBB')
  .transform((value) => normalizeHexColor(value) ?? value)

function setNormalizedColor(
  onChange: (value: string) => void,
  raw: string
) {
  const normalized = normalizeHexColor(raw)
  if (normalized) onChange(normalized)
}

const organizationSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(100, "Organization name must be less than 100 characters"),
  theme_preset: z.enum(['default', 'blue', 'green', 'purple', 'dark', 'custom']).optional(),
  primary_color: hexColorField.optional(),
  secondary_color: hexColorField.optional(),
  accent_color: hexColorField.optional(),
  background_color: hexColorField.optional(),
  surface_color: hexColorField.optional(),
  sidebar_color: hexColorField.optional(),
  border_color: hexColorField.optional(),
  text_color: hexColorField.optional(),
  muted_text_color: hexColorField.optional(),
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
    defaultValues: (() => {
      const resolved = resolveOrganizationTheme(organization)
      const tokens = resolved?.tokens ?? {}
      return {
        name: organization?.name || '',
        theme_preset: resolved?.preset || 'default',
        primary_color: resolved?.colors.primary || '#2563EB',
        secondary_color: resolved?.colors.secondary || '#64748B',
        accent_color: resolved?.colors.accent || '#0EA5E9',
        background_color: tokens.background || '#F8FAFC',
        surface_color: tokens.surface || '#FFFFFF',
        sidebar_color: tokens.sidebar || '#FFFFFF',
        border_color: tokens.border || '#E5E7EB',
        text_color: tokens.foreground || '#0F172A',
        muted_text_color: tokens.mutedForeground || '#475569',
      }
    })(),
  })

  const selectedThemePreset = watch('theme_preset')

  const applyBuiltInPreset = (preset: Exclude<OrganizationFormData['theme_preset'], 'custom' | undefined>) => {
    if (!isBuiltInPreset(preset)) return
    const values = applyPresetToFormValues(preset)
    ;(Object.entries(values) as [keyof OrganizationFormData, string][]).forEach(([key, value]) => {
      setValue(key, value, { shouldDirty: true })
    })
  }

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
        <div className="h-20 w-20 rounded-xl border border-border bg-muted overflow-hidden flex items-center justify-center">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt="Organization logo" className="h-full w-full object-contain" />
          ) : (
            <div className="text-xs text-muted-foreground text-center px-2">No logo</div>
          )}
        </div>
        <div>
          <h3 className={settingsFormSectionTitle}>Company logo</h3>
          <p className="text-sm text-muted-foreground">Upload a logo to show in the dashboard header.</p>
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
          <p className={`${settingsFormHint} mt-1`}>JPG, PNG, or WebP up to 5MB</p>
        </div>
      </div>

      {/* Organization Name Field */}
      <div className="space-y-2">
        <label htmlFor="name" className={settingsFormLabel}>
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
        <label className={settingsFormLabel}>Organization ID</label>
        <Input
          value={organization?.id}
          disabled
          className="w-full bg-muted font-mono text-sm"
        />
        <p className={settingsFormHint}>Unique identifier for your organization</p>
      </div>

      {/* Created Date (Read-only) */}
      <div className="space-y-2">
        <label className={settingsFormLabel}>Created</label>
        <Input
          value={organization?.created_at ? new Date(organization.created_at).toLocaleDateString() : 'Unknown'}
          disabled
          className="w-full bg-muted"
        />
      </div>

      {/* Theme Settings */}
      <div className="border-t border-border pt-6 mt-6">
        <div className="flex items-center mb-4">
          <Palette className="h-5 w-5 text-muted-foreground mr-2" />
          <h3 className={settingsFormSectionTitle}>Theme Customization</h3>
        </div>

        <div className="space-y-2 mb-4">
          <label className={settingsFormLabel}>Theme Preset</label>
          <Controller
            name="theme_preset"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value)
                  if (isBuiltInPreset(value)) applyBuiltInPreset(value)
                }}
              >
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
                <label htmlFor="primary_color" className={settingsFormLabel}>
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
                        onChange={(e) => setNormalizedColor(field.onChange, e.target.value)}
                        className="w-16 h-10 p-1 border border-input rounded"
                      />
                    )}
                  />
                  <Controller
                    name="primary_color"
                    control={control}
                    render={({ field }) => (
                      <Input
                        value={field.value}
                        onChange={(e) => setNormalizedColor(field.onChange, e.target.value)}
                        onBlur={(e) => setNormalizedColor(field.onChange, e.target.value)}
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
                <label htmlFor="secondary_color" className={settingsFormLabel}>
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
                        onChange={(e) => setNormalizedColor(field.onChange, e.target.value)}
                        className="w-16 h-10 p-1 border border-input rounded"
                      />
                    )}
                  />
                  <Controller
                    name="secondary_color"
                    control={control}
                    render={({ field }) => (
                      <Input
                        value={field.value}
                        onChange={(e) => setNormalizedColor(field.onChange, e.target.value)}
                        onBlur={(e) => setNormalizedColor(field.onChange, e.target.value)}
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
                <label htmlFor="accent_color" className={settingsFormLabel}>
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
                        onChange={(e) => setNormalizedColor(field.onChange, e.target.value)}
                        className="w-16 h-10 p-1 border border-input rounded"
                      />
                    )}
                  />
                  <Controller
                    name="accent_color"
                    control={control}
                    render={({ field }) => (
                      <Input
                        value={field.value}
                        onChange={(e) => setNormalizedColor(field.onChange, e.target.value)}
                        onBlur={(e) => setNormalizedColor(field.onChange, e.target.value)}
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

            <div className="mt-4 border-t border-border pt-4">
              <h4 className="text-sm font-semibold text-foreground">Surfaces & layout</h4>
              <p className={`${settingsFormHint} mt-1`}>
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
                    <label className={settingsFormLabel}>{label}</label>
                    <div className="flex gap-2">
                      <Controller
                        name={key}
                        control={control}
                        render={({ field }) => (
                          <Input
                            type="color"
                            value={field.value as any}
                            onChange={(e) => setNormalizedColor(field.onChange, e.target.value)}
                            className="w-16 h-10 p-1 border border-input rounded"
                          />
                        )}
                      />
                      <Controller
                        name={key}
                        control={control}
                        render={({ field }) => (
                          <Input
                            value={field.value as any}
                            onChange={(e) => setNormalizedColor(field.onChange, e.target.value)}
                            onBlur={(e) => setNormalizedColor(field.onChange, e.target.value)}
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

            <p className={settingsFormHint}>
              Tip: start by adjusting surfaces first (background/cards/sidebar), then tweak accents.
            </p>
          </div>
        )}

        {isBuiltInPreset(selectedThemePreset) ? (
          <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
            <p className={settingsFormHint}>
              This preset updates primary, accent, background, cards, sidebar, borders, and text. Save to apply
              across the workspace.
            </p>
            <div className="flex flex-wrap gap-3">
              {(
                [
                  ['Primary', watch('primary_color')],
                  ['Accent', watch('accent_color')],
                  ['Background', watch('background_color')],
                  ['Cards', watch('surface_color')],
                ] as const
              ).map(([label, color]) => (
                <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className="h-6 w-6 rounded border border-border shrink-0"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                  {label}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className={settingsFormHint}>
            Custom mode lets you tune brand colors and every surface. Presets apply a coordinated palette in one step.
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
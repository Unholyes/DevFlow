"use server"

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const updateProfileSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(100, "Full name must be less than 100 characters"),
  avatar_url: z.string().url('Invalid avatar URL').optional(),
})

export async function updateProfile(formData: FormData) {
  try {
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Not authenticated')
    }

    // Validate form data
    const validatedData = updateProfileSchema.parse({
      full_name: formData.get('full_name'),
      avatar_url: formData.get('avatar_url') || undefined,
    })

    // Update profile
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: validatedData.full_name,
        avatar_url: validatedData.avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath('/settings/profile')
    return { success: true }
  } catch (error) {
    console.error('Error updating profile:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update profile'
    }
  }
}

const updateOrganizationSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(100, "Organization name must be less than 100 characters"),
  theme_preset: z.enum(['default', 'blue', 'green', 'purple', 'dark', 'custom']).optional(),
  icon_url: z.string().url('Invalid logo URL').optional(),
  background_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  surface_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  sidebar_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  border_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  text_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  muted_text_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
})

export async function updateOrganization(formData: FormData) {
  try {
    const supabase = createClient()
    const admin = createAdminClient()

    // Get current user and verify they are a tenant admin
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Not authenticated')
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'tenant_admin') {
      throw new Error('Insufficient permissions')
    }

    const organizationId = String(formData.get('organization_id') ?? '').trim()
    if (!organizationId) throw new Error('Organization not found')

    // Org-scoped authorization: only allow Owners/Admins to update org settings.
    const { data: membership } = await supabase
      .from('organization_members')
      .select('system_role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .maybeSingle()

    const systemRole = String((membership as any)?.system_role ?? 'Member')
    const canAdmin = systemRole === 'Owner' || systemRole === 'Admin'
    if (!canAdmin) throw new Error('Insufficient permissions')

    // Validate form data
    const validatedData = updateOrganizationSchema.parse({
      name: formData.get('name'),
      theme_preset: formData.get('theme_preset') || undefined,
      icon_url: formData.get('icon_url') || undefined,
      background_color: formData.get('background_color') || undefined,
      surface_color: formData.get('surface_color') || undefined,
      sidebar_color: formData.get('sidebar_color') || undefined,
      border_color: formData.get('border_color') || undefined,
      text_color: formData.get('text_color') || undefined,
      muted_text_color: formData.get('muted_text_color') || undefined,
    })

    // Update organization
    const updateData: any = {
      name: validatedData.name,
      updated_at: new Date().toISOString(),
    }

    if (validatedData.theme_preset) updateData.theme_preset = validatedData.theme_preset
    if (validatedData.icon_url) updateData.icon_url = validatedData.icon_url
    if (validatedData.background_color) updateData.background_color = validatedData.background_color
    if (validatedData.surface_color) updateData.surface_color = validatedData.surface_color
    if (validatedData.sidebar_color) updateData.sidebar_color = validatedData.sidebar_color
    if (validatedData.border_color) updateData.border_color = validatedData.border_color
    if (validatedData.text_color) updateData.text_color = validatedData.text_color
    if (validatedData.muted_text_color) updateData.muted_text_color = validatedData.muted_text_color

    console.log('Updating organization:', organizationId, 'with data:', updateData)

    const { error } = await admin
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath('/settings/organization')
    return { success: true }
  } catch (error) {
    console.error('Error updating organization:', error)
    console.error('Form data received:', {
      name: formData.get('name'),
      theme_preset: formData.get('theme_preset'),
      icon_url: formData.get('icon_url'),
      background_color: formData.get('background_color'),
      surface_color: formData.get('surface_color'),
      sidebar_color: formData.get('sidebar_color'),
      border_color: formData.get('border_color'),
      text_color: formData.get('text_color'),
      muted_text_color: formData.get('muted_text_color'),
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update organization'
    }
  }
}
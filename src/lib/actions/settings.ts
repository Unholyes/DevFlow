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
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  secondary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  accent_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
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

    // Find the org the user can administer (owner OR org admin member)
    let organizationId: string | null = null

    const { data: ownedOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (ownedOrg?.id) {
      organizationId = ownedOrg.id
    } else {
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (membership?.organization_id && membership.role === 'admin') {
        organizationId = membership.organization_id
      }
    }

    if (!organizationId) {
      throw new Error('Organization not found')
    }

    // Validate form data
    const validatedData = updateOrganizationSchema.parse({
      name: formData.get('name'),
      theme_preset: formData.get('theme_preset') || undefined,
      primary_color: formData.get('primary_color') || undefined,
      secondary_color: formData.get('secondary_color') || undefined,
      accent_color: formData.get('accent_color') || undefined,
    })

    // Update organization
    const updateData: any = {
      name: validatedData.name,
      updated_at: new Date().toISOString(),
    }

    if (validatedData.theme_preset) updateData.theme_preset = validatedData.theme_preset
    if (validatedData.primary_color) updateData.primary_color = validatedData.primary_color.toUpperCase()
    if (validatedData.secondary_color) updateData.secondary_color = validatedData.secondary_color.toUpperCase()
    if (validatedData.accent_color) updateData.accent_color = validatedData.accent_color.toUpperCase()

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
      primary_color: formData.get('primary_color'),
      secondary_color: formData.get('secondary_color'),
      accent_color: formData.get('accent_color'),
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update organization'
    }
  }
}
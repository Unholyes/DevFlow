"use server"

import { createClient } from '@/lib/supabase/server'
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
})

export async function updateOrganization(formData: FormData) {
  try {
    const supabase = createClient()

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

    // Get user's organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (orgError || !org) {
      throw new Error('Organization not found')
    }

    // Validate form data
    const validatedData = updateOrganizationSchema.parse({
      name: formData.get('name'),
    })

    // Update organization
    const { error } = await supabase
      .from('organizations')
      .update({
        name: validatedData.name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', org.id)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath('/settings/organization')
    return { success: true }
  } catch (error) {
    console.error('Error updating organization:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update organization'
    }
  }
}
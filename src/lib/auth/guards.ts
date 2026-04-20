import { createClient } from '@/lib/supabase/server'
import { USER_ROLES } from '@/constants'
import type { UserRole } from './role-check'

/**
 * Check if the current user has the required role
 * Returns { hasAccess: boolean, role: UserRole | null }
 */
export async function checkUserRole(requiredRole: UserRole): Promise<{
  hasAccess: boolean
  role: UserRole | null
}> {
  try {
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { hasAccess: false, role: null }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { hasAccess: false, role: null }
    }

    const hasAccess = profile.role === requiredRole
    return { hasAccess, role: profile.role as UserRole }
  } catch (error) {
    console.error('Error checking user role:', error)
    return { hasAccess: false, role: null }
  }
}

/**
 * Check if the current user is a super admin
 */
export async function requireSuperAdmin(): Promise<{
  hasAccess: boolean
  role: UserRole | null
}> {
  return checkUserRole(USER_ROLES.SUPER_ADMIN)
}

/**
 * Check if the current user is a tenant admin
 */
export async function requireTenantAdmin(): Promise<{
  hasAccess: boolean
  role: UserRole | null
}> {
  return checkUserRole(USER_ROLES.TENANT_ADMIN)
}

/**
 * Check if the current user is authenticated (any role)
 */
export async function requireAuth(): Promise<{
  hasAccess: boolean
  role: UserRole | null
}> {
  try {
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { hasAccess: false, role: null }
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return { hasAccess: false, role: null }
    }

    return { hasAccess: true, role: profile.role as UserRole }
  } catch (error) {
    console.error('Error checking auth:', error)
    return { hasAccess: false, role: null }
  }
}

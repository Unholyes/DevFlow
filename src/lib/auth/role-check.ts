import { createClient } from '@/lib/supabase/server'
import { USER_ROLES } from '@/constants'

export type UserRole = 'super_admin' | 'tenant_admin' | 'team_member'

/**
 * Get the current user's role from the profiles table
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (error || !data) {
      return null
    }

    return data.role as UserRole
  } catch (error) {
    console.error('Error getting user role:', error)
    return null
  }
}

/**
 * Check if the current user is a super admin
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId)
  return role === USER_ROLES.SUPER_ADMIN
}

/**
 * Check if the current user is a tenant admin
 */
export async function isTenantAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId)
  return role === USER_ROLES.TENANT_ADMIN
}

/**
 * Check if the current user is a team member
 */
export async function isTeamMember(userId: string): Promise<boolean> {
  const role = await getUserRole(userId)
  return role === USER_ROLES.TEAM_MEMBER
}

/**
 * Check if the user has any of the specified roles
 */
export async function hasRole(userId: string, roles: UserRole[]): Promise<boolean> {
  const userRole = await getUserRole(userId)
  return userRole ? roles.includes(userRole) : false
}

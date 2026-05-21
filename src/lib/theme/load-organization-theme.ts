import type { OrganizationTheme } from '@/components/theme/theme-provider'
import { resolveOrganizationTheme } from '@/lib/theme/resolve-organization-theme'

export const ORGANIZATION_THEME_COLUMNS =
  'theme_preset, primary_color, secondary_color, accent_color, background_color, surface_color, sidebar_color, border_color, text_color, muted_text_color' as const

export type OrganizationThemeRow = {
  theme_preset?: string | null
  primary_color?: string | null
  secondary_color?: string | null
  accent_color?: string | null
  background_color?: string | null
  surface_color?: string | null
  sidebar_color?: string | null
  border_color?: string | null
  text_color?: string | null
  muted_text_color?: string | null
}

export function buildOrganizationTheme(
  orgData: OrganizationThemeRow | null | undefined,
): Partial<OrganizationTheme> | undefined {
  const resolved = resolveOrganizationTheme(orgData)
  return resolved
}

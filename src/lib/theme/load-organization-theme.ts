import type { OrganizationTheme } from '@/components/theme/theme-provider'

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

const PRESETS = new Set<OrganizationTheme['preset']>(['default', 'blue', 'green', 'purple', 'dark', 'custom'])

export function buildOrganizationTheme(
  orgData: OrganizationThemeRow | null | undefined,
): Partial<OrganizationTheme> | undefined {
  if (!orgData) return undefined

  const preset = PRESETS.has(orgData.theme_preset as OrganizationTheme['preset'])
    ? (orgData.theme_preset as OrganizationTheme['preset'])
    : 'default'

  return {
    preset,
    colors: {
      primary: orgData.primary_color || '#3B82F6',
      secondary: orgData.secondary_color || '#64748B',
      accent: orgData.accent_color || '#10B981',
    },
    tokens: {
      background: orgData.background_color ?? undefined,
      surface: orgData.surface_color ?? undefined,
      sidebar: orgData.sidebar_color ?? undefined,
      border: orgData.border_color ?? undefined,
      foreground: orgData.text_color ?? undefined,
      mutedForeground: orgData.muted_text_color ?? undefined,
    },
  }
}

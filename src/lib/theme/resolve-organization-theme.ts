import type { OrganizationTheme } from '@/components/theme/theme-provider'
import type { OrganizationThemeRow } from '@/lib/theme/load-organization-theme'
import { isBuiltInPreset, THEME_PRESET_BUNDLES } from '@/lib/theme/organization-theme-presets'

/**
 * Resolves DB theme row into runtime theme. Built-in presets use the full bundle;
 * custom uses stored colors and layout tokens.
 */
export function resolveOrganizationTheme(
  orgData: OrganizationThemeRow | null | undefined,
): OrganizationTheme | undefined {
  if (!orgData) return undefined

  const presetRaw = orgData.theme_preset
  const preset = isBuiltInPreset(presetRaw)
    ? presetRaw
    : presetRaw === 'custom'
      ? 'custom'
      : 'default'

  if (preset !== 'custom') {
    const bundle = THEME_PRESET_BUNDLES[preset]
    return {
      preset,
      colors: { ...bundle.colors },
      tokens: { ...bundle.tokens },
    }
  }

  return {
    preset: 'custom',
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

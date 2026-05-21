import type { OrganizationTheme } from '@/components/theme/theme-provider'

export type ThemePresetId = OrganizationTheme['preset']

export type ThemePresetBundle = {
  colors: OrganizationTheme['colors']
  tokens: Required<NonNullable<OrganizationTheme['tokens']>>
}

export const THEME_PRESET_BUNDLES: Record<Exclude<ThemePresetId, 'custom'>, ThemePresetBundle> = {
  default: {
    colors: { primary: '#2563EB', secondary: '#64748B', accent: '#0EA5E9' },
    tokens: {
      background: '#F8FAFC',
      surface: '#FFFFFF',
      sidebar: '#FFFFFF',
      border: '#E5E7EB',
      foreground: '#0F172A',
      mutedForeground: '#475569',
    },
  },
  blue: {
    colors: { primary: '#1D4ED8', secondary: '#475569', accent: '#0284C7' },
    tokens: {
      background: '#EFF6FF',
      surface: '#FFFFFF',
      sidebar: '#F8FAFC',
      border: '#BFDBFE',
      foreground: '#0F172A',
      mutedForeground: '#475569',
    },
  },
  green: {
    colors: { primary: '#059669', secondary: '#64748B', accent: '#10B981' },
    tokens: {
      background: '#ECFDF5',
      surface: '#FFFFFF',
      sidebar: '#F8FAFC',
      border: '#A7F3D0',
      foreground: '#0F172A',
      mutedForeground: '#475569',
    },
  },
  purple: {
    colors: { primary: '#7C3AED', secondary: '#64748B', accent: '#8B5CF6' },
    tokens: {
      background: '#F5F3FF',
      surface: '#FFFFFF',
      sidebar: '#FAF5FF',
      border: '#DDD6FE',
      foreground: '#1E1B4B',
      mutedForeground: '#5B21B6',
    },
  },
  dark: {
    colors: { primary: '#3B82F6', secondary: '#94A3B8', accent: '#22D3EE' },
    tokens: {
      background: '#0B1220',
      surface: '#0F172A',
      sidebar: '#0F172A',
      border: '#1F2A3D',
      foreground: '#E5E7EB',
      mutedForeground: '#9CA3AF',
    },
  },
}

export function isBuiltInPreset(preset: string | null | undefined): preset is Exclude<ThemePresetId, 'custom'> {
  return preset != null && preset !== 'custom' && preset in THEME_PRESET_BUNDLES
}

export function applyPresetToFormValues(preset: Exclude<ThemePresetId, 'custom'>) {
  const bundle = THEME_PRESET_BUNDLES[preset]
  return {
    theme_preset: preset,
    primary_color: bundle.colors.primary,
    secondary_color: bundle.colors.secondary,
    accent_color: bundle.colors.accent,
    background_color: bundle.tokens.background,
    surface_color: bundle.tokens.surface,
    sidebar_color: bundle.tokens.sidebar,
    border_color: bundle.tokens.border,
    text_color: bundle.tokens.foreground,
    muted_text_color: bundle.tokens.mutedForeground,
  }
}

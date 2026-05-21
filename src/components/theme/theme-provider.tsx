'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  blendHex,
  isDarkThemeSurface,
  isValidHexColor,
  readableForegroundForBackground,
  readableMutedForBackground,
  readableOnPrimary,
} from '@/lib/theme/resolve-theme-tokens'
import { resolveOrganizationTheme } from '@/lib/theme/resolve-organization-theme'
import type { OrganizationThemeRow } from '@/lib/theme/load-organization-theme'

export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
}

export interface OrganizationTheme {
  preset: 'default' | 'blue' | 'green' | 'purple' | 'dark' | 'custom'
  colors: ThemeColors
  tokens?: Partial<{
    background: string
    surface: string
    sidebar: string
    border: string
    foreground: string
    mutedForeground: string
  }>
}

const defaultTheme: OrganizationTheme = {
  preset: 'default',
  colors: {
    primary: '#2563EB',
    secondary: '#64748B',
    accent: '#0EA5E9',
  },
}

const ThemeContext = createContext<OrganizationTheme>(defaultTheme)

export function useTheme() {
  return useContext(ThemeContext)
}

interface ThemeProviderProps {
  children: ReactNode
  organizationTheme?: Partial<OrganizationTheme>
}

function mergeTheme(input?: Partial<OrganizationTheme>): OrganizationTheme {
  if (!input) return defaultTheme
  return {
    preset: input.preset || 'default',
    colors: {
      primary: input.colors?.primary || defaultTheme.colors.primary,
      secondary: input.colors?.secondary || defaultTheme.colors.secondary,
      accent: input.colors?.accent || defaultTheme.colors.accent,
    },
    tokens: input.tokens,
  }
}

export function ThemeProvider({ children, organizationTheme }: ThemeProviderProps) {
  const [theme, setTheme] = useState<OrganizationTheme>(defaultTheme)

  useEffect(() => {
    setTheme(mergeTheme(organizationTheme))
  }, [organizationTheme])

  useEffect(() => {
    const root = document.documentElement
    const { colors } = theme
    const tokens = theme.tokens ?? {}

    root.style.setProperty('--theme-primary', colors.primary)
    root.style.setProperty('--theme-secondary', colors.secondary)
    root.style.setProperty('--theme-accent', colors.accent)

    root.style.setProperty('--tw-ring-color', colors.primary)
    root.style.setProperty('--tw-primary', colors.primary)
    root.style.setProperty('--tw-primary-foreground', readableOnPrimary(colors.primary))

    const background = isValidHexColor(tokens.background) ? tokens.background : '#F8FAFC'
    const surface = isValidHexColor(tokens.surface) ? tokens.surface : '#FFFFFF'
    const sidebar = isValidHexColor(tokens.sidebar) ? tokens.sidebar : surface
    const border = isValidHexColor(tokens.border) ? tokens.border : '#E5E7EB'

    const foreground = readableForegroundForBackground(
      surface,
      isValidHexColor(tokens.foreground) ? tokens.foreground : undefined,
    )
    const mutedForeground = readableMutedForBackground(
      surface,
      isValidHexColor(tokens.mutedForeground) ? tokens.mutedForeground : undefined,
    )

    const tintedBackground =
      theme.preset !== 'dark' && theme.preset !== 'custom'
        ? blendHex(background, colors.primary, 0.04)
        : background

    const mutedSurface = blendHex(surface, foreground, 0.06)
    const secondarySurface = blendHex(surface, foreground, 0.04)
    const accentSurface = blendHex(surface, colors.accent, 0.14)
    const primaryForeground = readableOnPrimary(colors.primary)
    const accentForeground = readableForegroundForBackground(accentSurface)

    root.style.setProperty('--theme-background', tintedBackground)
    root.style.setProperty('--theme-surface', surface)
    root.style.setProperty('--theme-sidebar', sidebar)
    root.style.setProperty('--theme-border', border)
    root.style.setProperty('--theme-foreground', foreground)
    root.style.setProperty('--theme-muted-foreground', mutedForeground)

    root.style.setProperty('--background', tintedBackground)
    root.style.setProperty('--foreground', foreground)
    root.style.setProperty('--card', surface)
    root.style.setProperty('--card-foreground', foreground)
    root.style.setProperty('--popover', surface)
    root.style.setProperty('--popover-foreground', foreground)
    root.style.setProperty('--border', border)
    root.style.setProperty('--input', border)
    root.style.setProperty('--muted', mutedSurface)
    root.style.setProperty('--muted-foreground', mutedForeground)
    root.style.setProperty('--secondary', secondarySurface)
    root.style.setProperty('--secondary-foreground', foreground)
    root.style.setProperty('--accent', accentSurface)
    root.style.setProperty('--accent-foreground', accentForeground)
    root.style.setProperty('--primary', colors.primary)
    root.style.setProperty('--primary-foreground', primaryForeground)
    root.style.setProperty('--ring', colors.primary)

    root.classList.remove('theme-default', 'theme-blue', 'theme-green', 'theme-purple', 'theme-dark', 'theme-custom')
    root.classList.add(`theme-${theme.preset}`)
    root.dataset.themeContrast = isDarkThemeSurface(tintedBackground, surface) ? 'dark' : 'light'
  }, [theme])

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

/** For client previews in organization settings form */
export function themeFromFormValues(values: {
  theme_preset?: string
  primary_color?: string
  secondary_color?: string
  accent_color?: string
  background_color?: string
  surface_color?: string
  sidebar_color?: string
  border_color?: string
  text_color?: string
  muted_text_color?: string
}): OrganizationTheme {
  return resolveOrganizationTheme(values as OrganizationThemeRow) ?? defaultTheme
}

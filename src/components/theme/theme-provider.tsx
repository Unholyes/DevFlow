'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  blendHex,
  hexToRgb,
  isDarkThemeSurface,
  isValidHexColor,
  readableForegroundForBackground,
  readableMutedForBackground,
  readableOnPrimary,
} from '@/lib/theme/resolve-theme-tokens'

interface ThemeColors {
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
    primary: '#3B82F6',
    secondary: '#64748B',
    accent: '#10B981',
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

export function ThemeProvider({ children, organizationTheme }: ThemeProviderProps) {
  const [theme, setTheme] = useState<OrganizationTheme>(defaultTheme)

  useEffect(() => {
    if (organizationTheme) {
      const mergedTheme = {
        preset: organizationTheme.preset || 'default',
        colors: {
          primary: organizationTheme.colors?.primary || defaultTheme.colors.primary,
          secondary: organizationTheme.colors?.secondary || defaultTheme.colors.secondary,
          accent: organizationTheme.colors?.accent || defaultTheme.colors.accent,
        },
        tokens: organizationTheme.tokens ?? undefined,
      }
      setTheme(mergedTheme)
    }
  }, [organizationTheme])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--theme-primary', theme.colors.primary)
    root.style.setProperty('--theme-secondary', theme.colors.secondary)
    root.style.setProperty('--theme-accent', theme.colors.accent)

    root.style.setProperty('--tw-ring-color', theme.colors.primary)
    root.style.setProperty('--tw-primary', theme.colors.primary)
    root.style.setProperty('--tw-primary-foreground', readableOnPrimary(theme.colors.primary))

    const presetBase =
      theme.preset === 'dark'
        ? {
            background: '#0B1220',
            surface: '#0F172A',
            sidebar: '#0F172A',
            border: '#1F2A3D',
            foreground: '#E5E7EB',
            mutedForeground: '#9CA3AF',
          }
        : theme.preset === 'purple'
          ? {
              background: '#F7F5FF',
              surface: '#FFFFFF',
              sidebar: '#FFFFFF',
              border: '#E5E7EB',
              foreground: '#0F172A',
              mutedForeground: '#475569',
            }
          : theme.preset === 'green'
            ? {
                background: '#F4FBF8',
                surface: '#FFFFFF',
                sidebar: '#FFFFFF',
                border: '#E5E7EB',
                foreground: '#0F172A',
                mutedForeground: '#475569',
              }
            : theme.preset === 'blue'
              ? {
                  background: '#F4F8FF',
                  surface: '#FFFFFF',
                  sidebar: '#FFFFFF',
                  border: '#E5E7EB',
                  foreground: '#0F172A',
                  mutedForeground: '#475569',
                }
              : {
                  background: '#F8FAFC',
                  surface: '#FFFFFF',
                  sidebar: '#FFFFFF',
                  border: '#E5E7EB',
                  foreground: '#0F172A',
                  mutedForeground: '#475569',
                }

    const customTokens = theme.preset === 'custom' ? theme.tokens : undefined
    const background = isValidHexColor(customTokens?.background)
      ? customTokens.background
      : presetBase.background
    const surface = isValidHexColor(customTokens?.surface) ? customTokens.surface : presetBase.surface
    const sidebar = isValidHexColor(customTokens?.sidebar) ? customTokens.sidebar : presetBase.sidebar
    const border = isValidHexColor(customTokens?.border) ? customTokens.border : presetBase.border

    const textReference = surface
    const foreground = readableForegroundForBackground(
      textReference,
      isValidHexColor(customTokens?.foreground) ? customTokens.foreground : presetBase.foreground,
    )
    const mutedForeground = readableMutedForBackground(
      textReference,
      isValidHexColor(customTokens?.mutedForeground)
        ? customTokens.mutedForeground
        : presetBase.mutedForeground,
    )

    const tintedBackground =
      theme.preset !== 'dark' && theme.preset !== 'custom'
        ? blendHex(background, theme.colors.primary, 0.03)
        : background

    const mutedSurface = blendHex(surface, foreground, 0.06)
    const secondarySurface = blendHex(surface, foreground, 0.04)
    const primaryForeground = readableOnPrimary(theme.colors.primary)
    const accentForeground = readableOnPrimary(theme.colors.accent)

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
    root.style.setProperty('--accent', blendHex(surface, theme.colors.accent, 0.12))
    root.style.setProperty('--accent-foreground', accentForeground)
    root.style.setProperty('--primary', theme.colors.primary)
    root.style.setProperty('--primary-foreground', primaryForeground)
    root.style.setProperty('--ring', theme.colors.primary)

    const primaryRgb = hexToRgb(theme.colors.primary)
    const secondaryRgb = hexToRgb(theme.colors.secondary)
    const accentRgb = hexToRgb(theme.colors.accent)
    if (primaryRgb) root.style.setProperty('--theme-primary-rgb', `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`)
    if (secondaryRgb)
      root.style.setProperty('--theme-secondary-rgb', `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}`)
    if (accentRgb) root.style.setProperty('--theme-accent-rgb', `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`)

    root.classList.remove('theme-default', 'theme-blue', 'theme-green', 'theme-purple', 'theme-dark', 'theme-custom')
    root.classList.add(`theme-${theme.preset}`)
    root.dataset.themeContrast = isDarkThemeSurface(tintedBackground, surface) ? 'dark' : 'light'
  }, [theme])

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

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

// Helper function to convert hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

function blendHex(a: string, b: string, t: number) {
  const ar = hexToRgb(a)
  const br = hexToRgb(b)
  if (!ar || !br) return a
  const k = clamp01(t)
  const r = Math.round(ar.r + (br.r - ar.r) * k)
  const g = Math.round(ar.g + (br.g - ar.g) * k)
  const b2 = Math.round(ar.b + (br.b - ar.b) * k)
  return `#${[r, g, b2].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

function isValidHexColor(hex: string | null | undefined) {
  return typeof hex === 'string' && /^#[0-9A-F]{6}$/i.test(hex.trim())
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
    // Apply theme colors to CSS variables
    const root = document.documentElement
    root.style.setProperty('--theme-primary', theme.colors.primary)
    root.style.setProperty('--theme-secondary', theme.colors.secondary)
    root.style.setProperty('--theme-accent', theme.colors.accent)

    // Apply theme colors to Tailwind CSS variables for broader usage
    root.style.setProperty('--tw-ring-color', theme.colors.primary)
    root.style.setProperty('--tw-primary', theme.colors.primary)
    root.style.setProperty('--tw-primary-foreground', '#ffffff')

    // Create derived tokens for professional surfaces.
    const presetBase =
      theme.preset === 'dark'
        ? {
            background: '#0B1220',
            surface: '#0F172A',
            sidebar: '#0F172A',
            border: '#1F2A3D',
            foreground: '#E5E7EB',
            mutedForeground: '#9CA3AF',
            popover: '#111C33',
          }
        : theme.preset === 'purple'
          ? {
              background: '#F7F5FF',
              surface: '#FFFFFF',
              sidebar: '#FFFFFF',
              border: '#E5E7EB',
              foreground: '#0F172A',
              mutedForeground: '#475569',
              popover: '#FFFFFF',
            }
          : theme.preset === 'green'
            ? {
                background: '#F4FBF8',
                surface: '#FFFFFF',
                sidebar: '#FFFFFF',
                border: '#E5E7EB',
                foreground: '#0F172A',
                mutedForeground: '#475569',
                popover: '#FFFFFF',
              }
            : theme.preset === 'blue'
              ? {
                  background: '#F4F8FF',
                  surface: '#FFFFFF',
                  sidebar: '#FFFFFF',
                  border: '#E5E7EB',
                  foreground: '#0F172A',
                  mutedForeground: '#475569',
                  popover: '#FFFFFF',
                }
              : {
                  background: '#F8FAFC',
                  surface: '#FFFFFF',
                  sidebar: '#FFFFFF',
                  border: '#E5E7EB',
                  foreground: '#0F172A',
                  mutedForeground: '#475569',
                  popover: '#FFFFFF',
                }

    const customTokens = theme.preset === 'custom' ? theme.tokens : undefined
    const background = isValidHexColor(customTokens?.background) ? (customTokens?.background as string) : presetBase.background
    const surface = isValidHexColor(customTokens?.surface) ? (customTokens?.surface as string) : presetBase.surface
    const sidebar = isValidHexColor(customTokens?.sidebar) ? (customTokens?.sidebar as string) : presetBase.sidebar
    const border = isValidHexColor(customTokens?.border) ? (customTokens?.border as string) : presetBase.border
    const foreground = isValidHexColor(customTokens?.foreground) ? (customTokens?.foreground as string) : presetBase.foreground
    const mutedForeground = isValidHexColor(customTokens?.mutedForeground)
      ? (customTokens?.mutedForeground as string)
      : presetBase.mutedForeground

    // Subtle tint for light presets based on primary, but never for surfaces unless user explicitly sets them.
    const tintedBackground =
      theme.preset !== 'dark' && theme.preset !== 'custom'
        ? blendHex(background, theme.colors.primary, 0.03)
        : background

    root.style.setProperty('--theme-background', tintedBackground)
    root.style.setProperty('--theme-surface', surface)
    root.style.setProperty('--theme-sidebar', sidebar)
    root.style.setProperty('--theme-border', border)
    root.style.setProperty('--theme-foreground', foreground)
    root.style.setProperty('--theme-muted-foreground', mutedForeground)

    // Map into shadcn/radix tokens used by UI components.
    root.style.setProperty('--background', tintedBackground)
    root.style.setProperty('--foreground', foreground)
    root.style.setProperty('--card', surface)
    root.style.setProperty('--card-foreground', foreground)
    root.style.setProperty('--popover', presetBase.popover)
    root.style.setProperty('--popover-foreground', foreground)
    root.style.setProperty('--border', border)
    root.style.setProperty('--input', border)
    root.style.setProperty('--muted-foreground', mutedForeground)

    const primaryRgb = hexToRgb(theme.colors.primary)
    const secondaryRgb = hexToRgb(theme.colors.secondary)
    const accentRgb = hexToRgb(theme.colors.accent)
    if (primaryRgb) root.style.setProperty('--theme-primary-rgb', `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`)
    if (secondaryRgb) root.style.setProperty('--theme-secondary-rgb', `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}`)
    if (accentRgb) root.style.setProperty('--theme-accent-rgb', `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`)

    // Apply preset-specific classes
    root.classList.remove('theme-default', 'theme-blue', 'theme-green', 'theme-purple', 'theme-dark', 'theme-custom')
    root.classList.add(`theme-${theme.preset}`)
  }, [theme])

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  )
}
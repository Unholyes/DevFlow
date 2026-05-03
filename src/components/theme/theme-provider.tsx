'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface ThemeColors {
  primary: string
  secondary: string
  accent: string
}

interface OrganizationTheme {
  preset: 'default' | 'blue' | 'green' | 'purple' | 'dark' | 'custom'
  colors: ThemeColors
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
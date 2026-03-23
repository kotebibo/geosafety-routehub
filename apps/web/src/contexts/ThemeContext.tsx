'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

export type Theme = 'light' | 'dark' | 'night'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const STORAGE_KEY = 'routehub-theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')

  // Load theme from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    if (stored && ['light', 'dark', 'night'].includes(stored)) {
      setThemeState(stored)
      applyTheme(stored)
    }
  }, [])

  const applyTheme = (t: Theme) => {
    const root = document.documentElement
    // Remove all theme classes
    root.classList.remove('light', 'dark', 'night')
    // Add the active theme class (light has no class needed, but we add it for consistency)
    if (t !== 'light') {
      root.classList.add(t)
    }
  }

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    localStorage.setItem(STORAGE_KEY, t)
    applyTheme(t)
  }, [])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { STORAGE_KEYS } from '../lib/constants'

export type Theme = 'light' | 'dark'

const THEME_COLOR = { dark: '#08080c', light: '#f8fafc' } as const

/** Reads the class index.html's boot script already applied pre-paint, so
 * there's no mismatch flash between the two. */
function getInitialTheme(): Theme {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('light')) {
    return 'light'
  }
  return 'dark'
}

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)

    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', THEME_COLOR[theme])

    // iOS reads this link's href only at "Add to Home Screen" time (ignoring
    // the prefers-color-scheme variants in index.html), so keep it in sync on
    // every toggle -- re-add the shortcut afterward to pick up a later change.
    const appleTouchIcon = document.getElementById('apple-touch-icon')
    appleTouchIcon?.setAttribute(
      'href',
      theme === 'light' ? '/apple-touch-icon-light.png' : '/apple-touch-icon.png',
    )

    try {
      localStorage.setItem(STORAGE_KEYS.theme, theme)
    } catch {
      // Private browsing / storage disabled -- theme just won't persist.
    }
  }, [theme])

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}

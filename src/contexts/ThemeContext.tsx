import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { STORAGE_KEYS } from '../lib/constants'

type Theme = 'light' | 'dark'

/** 'system' follows the OS's own Reduce Transparency setting (the default); 'reduced' and
 * 'full' are explicit overrides set from Profile > Appearance, for people who want glass
 * chrome regardless of what their OS prefers either way. */
export type Transparency = 'system' | 'reduced' | 'full'

const THEME_COLOR = { dark: '#08080c', light: '#f8fafc' } as const
const TRANSPARENCY_CLASSES = { reduced: 'transparency-reduced', full: 'transparency-full' } as const

/** Reads the theme index.html's boot script already applied, to avoid a flash. */
function getInitialTheme(): Theme {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('light')) {
    return 'light'
  }
  return 'dark'
}

/** Reads the transparency override index.html's boot script already applied, to avoid a flash. */
function getInitialTransparency(): Transparency {
  if (typeof document !== 'undefined') {
    if (document.documentElement.classList.contains(TRANSPARENCY_CLASSES.reduced)) return 'reduced'
    if (document.documentElement.classList.contains(TRANSPARENCY_CLASSES.full)) return 'full'
  }
  return 'system'
}

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  transparency: Transparency
  setTransparency: (transparency: Transparency) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [transparency, setTransparency] = useState<Transparency>(getInitialTransparency)

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)

    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', THEME_COLOR[theme])

    const appleTouchIcon = document.getElementById('apple-touch-icon')
    appleTouchIcon?.setAttribute(
      'href',
      theme === 'light' ? '/apple-touch-icon-light.png' : '/apple-touch-icon.png',
    )

    try {
      localStorage.setItem(STORAGE_KEYS.theme, theme)
    } catch {}
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove(TRANSPARENCY_CLASSES.reduced, TRANSPARENCY_CLASSES.full)
    if (transparency !== 'system') {
      root.classList.add(TRANSPARENCY_CLASSES[transparency])
    }

    try {
      if (transparency === 'system') {
        localStorage.removeItem(STORAGE_KEYS.transparency)
      } else {
        localStorage.setItem(STORAGE_KEYS.transparency, transparency)
      }
    } catch {}
  }, [transparency])

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, toggleTheme, setTheme, transparency, setTransparency }),
    [theme, transparency],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}

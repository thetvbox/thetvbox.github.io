import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ThemeProvider, useTheme } from './ThemeContext'
import { STORAGE_KEYS } from '../lib/constants'

function setupDom() {
  document.documentElement.className = ''
  document.head.innerHTML = '<meta name="theme-color" content="" />'
  document.body.innerHTML = '<div id="apple-touch-icon"></div>'
}

beforeEach(() => {
  localStorage.clear()
  setupDom()
})

afterEach(() => {
  document.documentElement.className = ''
})

describe('ThemeContext', () => {
  it('defaults to dark when the root has no "light" class', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider })
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('picks up "light" already applied to the root by the boot script', () => {
    document.documentElement.classList.add('light')
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider })
    expect(result.current.theme).toBe('light')
  })

  it('toggleTheme flips between dark and light', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider })
    act(() => result.current.toggleTheme())
    expect(result.current.theme).toBe('light')
    act(() => result.current.toggleTheme())
    expect(result.current.theme).toBe('dark')
  })

  it('setTheme sets an explicit theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider })
    act(() => result.current.setTheme('light'))
    expect(result.current.theme).toBe('light')
  })

  it('persists the theme to localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider })
    act(() => result.current.toggleTheme())
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('light')
  })

  it('updates the theme-color meta tag and apple touch icon', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider })
    act(() => result.current.toggleTheme())
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', '#f8fafc')
    expect(document.getElementById('apple-touch-icon')).toHaveAttribute('href', '/apple-touch-icon-light.png')
  })

  it('throws when useTheme is called outside a provider', () => {
    expect(() => renderHook(() => useTheme())).toThrow('useTheme must be used within a ThemeProvider')
  })
})

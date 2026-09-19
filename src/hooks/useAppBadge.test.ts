import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAppBadge } from './useAppBadge'

function stubBadgeApi() {
  const setAppBadge = vi.fn().mockResolvedValue(undefined)
  const clearAppBadge = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { ...navigator, setAppBadge, clearAppBadge })
  return { setAppBadge, clearAppBadge }
}

describe('useAppBadge', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('sets the badge to the given count when positive', () => {
    const { setAppBadge, clearAppBadge } = stubBadgeApi()
    renderHook(() => useAppBadge(3))
    expect(setAppBadge).toHaveBeenCalledWith(3)
    expect(clearAppBadge).not.toHaveBeenCalled()
  })

  it('clears the badge when the count is zero', () => {
    const { setAppBadge, clearAppBadge } = stubBadgeApi()
    renderHook(() => useAppBadge(0))
    expect(clearAppBadge).toHaveBeenCalledTimes(1)
    expect(setAppBadge).not.toHaveBeenCalled()
  })

  it('updates the badge when the count changes', () => {
    const { setAppBadge } = stubBadgeApi()
    const { rerender } = renderHook(({ count }) => useAppBadge(count), { initialProps: { count: 1 } })
    expect(setAppBadge).toHaveBeenLastCalledWith(1)
    rerender({ count: 5 })
    expect(setAppBadge).toHaveBeenLastCalledWith(5)
  })

  it('clears the badge on unmount', () => {
    const { clearAppBadge } = stubBadgeApi()
    const { unmount } = renderHook(() => useAppBadge(2))
    clearAppBadge.mockClear()
    unmount()
    expect(clearAppBadge).toHaveBeenCalledTimes(1)
  })

  it('is a safe no-op when the Badging API is unsupported', () => {
    vi.stubGlobal('navigator', { ...navigator, setAppBadge: undefined, clearAppBadge: undefined })
    expect(() => renderHook(() => useAppBadge(4))).not.toThrow()
  })

  it('never throws when setAppBadge throws synchronously', () => {
    const setAppBadge = vi.fn().mockImplementation(() => {
      throw new Error('boom')
    })
    vi.stubGlobal('navigator', { ...navigator, setAppBadge, clearAppBadge: vi.fn().mockResolvedValue(undefined) })
    expect(() => renderHook(() => useAppBadge(1))).not.toThrow()
  })
})

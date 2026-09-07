import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDesktopAutoFocus } from './useDesktopAutoFocus'

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useDesktopAutoFocus', () => {
  it('does not focus when inactive', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useDesktopAutoFocus(false))
    const input = document.createElement('input')
    result.current.current = input
    const focusSpy = vi.spyOn(input, 'focus')
    expect(focusSpy).not.toHaveBeenCalled()
  })

  it('focuses the input when active on a fine-pointer (desktop) device', () => {
    mockMatchMedia(true)
    const input = document.createElement('input')
    document.body.appendChild(input)
    const focusSpy = vi.spyOn(input, 'focus')
    const { result, rerender } = renderHook(({ active }) => useDesktopAutoFocus(active), {
      initialProps: { active: false },
    })
    result.current.current = input
    rerender({ active: true })
    expect(focusSpy).toHaveBeenCalled()
    document.body.removeChild(input)
  })

  it('does not focus on a coarse-pointer (touch) device', () => {
    mockMatchMedia(false)
    const input = document.createElement('input')
    const focusSpy = vi.spyOn(input, 'focus')
    const { result, rerender } = renderHook(({ active }) => useDesktopAutoFocus(active), {
      initialProps: { active: false },
    })
    result.current.current = input
    rerender({ active: true })
    expect(focusSpy).not.toHaveBeenCalled()
  })
})

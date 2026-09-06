import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useEscapeAndFocusReturn } from './useEscapeAndFocusReturn'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('useEscapeAndFocusReturn', () => {
  it('does nothing while inactive', () => {
    const onClose = vi.fn()
    renderHook(() => useEscapeAndFocusReturn(false, onClose))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when Escape is pressed while active', () => {
    const onClose = vi.fn()
    renderHook(() => useEscapeAndFocusReturn(true, onClose))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ignores non-Escape keys', () => {
    const onClose = vi.fn()
    renderHook(() => useEscapeAndFocusReturn(true, onClose))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('always calls the latest onClose, not a stale closure', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = renderHook(({ onClose }) => useEscapeAndFocusReturn(true, onClose), {
      initialProps: { onClose: first },
    })
    rerender({ onClose: second })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('returns focus to whatever was focused when it became active, once deactivated', () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    expect(document.activeElement).toBe(trigger)

    const { rerender } = renderHook(({ active }) => useEscapeAndFocusReturn(active, vi.fn()), {
      initialProps: { active: true },
    })

    const other = document.createElement('input')
    document.body.appendChild(other)
    other.focus()
    expect(document.activeElement).toBe(other)

    rerender({ active: false })
    expect(document.activeElement).toBe(trigger)
  })

  it('removes its keydown listener on unmount', () => {
    const onClose = vi.fn()
    const { unmount } = renderHook(() => useEscapeAndFocusReturn(true, onClose))
    unmount()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(onClose).not.toHaveBeenCalled()
  })
})

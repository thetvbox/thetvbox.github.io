import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useToast } from './useToast'

describe('useToast', () => {
  it('starts with no toast', () => {
    const { result } = renderHook(() => useToast())
    expect(result.current.toast).toBeNull()
  })

  it('showUndo sets an info toast with an Undo action', () => {
    const { result } = renderHook(() => useToast())
    act(() => result.current.showUndo('Marked watched', vi.fn()))
    expect(result.current.toast).toMatchObject({ message: 'Marked watched', tone: 'info' })
    expect(result.current.toast?.action?.label).toBe('Undo')
  })

  it('showError sets an error toast with no action', () => {
    const { result } = renderHook(() => useToast())
    act(() => result.current.showError('Something failed'))
    expect(result.current.toast).toEqual({ message: 'Something failed', tone: 'error' })
  })

  it('dismiss clears the current toast', () => {
    const { result } = renderHook(() => useToast())
    act(() => result.current.showError('oops'))
    act(() => result.current.dismiss())
    expect(result.current.toast).toBeNull()
  })

  it("the Undo action's onClick clears the toast and runs the undo callback", () => {
    const onUndo = vi.fn()
    const { result } = renderHook(() => useToast())
    act(() => result.current.showUndo('Marked watched', onUndo))
    act(() => result.current.toast?.action?.onClick())
    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(result.current.toast).toBeNull()
  })

  it('a new toast replaces the previous un-actioned one instead of stacking', () => {
    const { result } = renderHook(() => useToast())
    act(() => result.current.showError('first'))
    act(() => result.current.showError('second'))
    expect(result.current.toast?.message).toBe('second')
  })
})

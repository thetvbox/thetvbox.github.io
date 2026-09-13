import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useDocumentTitle } from './useDocumentTitle'

describe('useDocumentTitle', () => {
  it('sets the tab title with the base app name appended', () => {
    renderHook(() => useDocumentTitle('Breaking Bad'))
    expect(document.title).toBe('Breaking Bad · TV Box')
  })

  it('falls back to the base title alone when given null', () => {
    renderHook(() => useDocumentTitle(null))
    expect(document.title).toBe('TV Box')
  })

  it('updates the title when the value changes', () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: 'Severance' },
    })
    expect(document.title).toBe('Severance · TV Box')
    rerender({ title: 'Ted Lasso' })
    expect(document.title).toBe('Ted Lasso · TV Box')
  })

  it('restores the base title on unmount', () => {
    const { unmount } = renderHook(() => useDocumentTitle('Severance'))
    expect(document.title).toBe('Severance · TV Box')
    unmount()
    expect(document.title).toBe('TV Box')
  })
})

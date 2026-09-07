import { renderHook } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useCloseOnNavigate } from './useCloseOnNavigate'

function renderAt(path: string, onClose: () => void) {
  return renderHook(() => useCloseOnNavigate(onClose), {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="*" element={<>{children}</>} />
        </Routes>
      </MemoryRouter>
    ),
  })
}

describe('useCloseOnNavigate', () => {
  it('calls onClose on initial mount', () => {
    const onClose = vi.fn()
    renderAt('/home', onClose)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose again on a re-render at the same path', () => {
    const onClose = vi.fn()
    const { rerender } = renderAt('/home', onClose)
    rerender()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

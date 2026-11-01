import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { useQueryParam } from './useQueryParam'

function wrapperAt(url: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  }
}

function useHarness() {
  const [q, setQ] = useQueryParam('q')
  return { q, setQ, search: useLocation().search }
}

describe('useQueryParam', () => {
  it('reads the param, or an empty string when it is missing', () => {
    expect(renderHook(() => useHarness(), { wrapper: wrapperAt('/search?q=lupin') }).result.current.q).toBe('lupin')
    expect(renderHook(() => useHarness(), { wrapper: wrapperAt('/search') }).result.current.q).toBe('')
  })

  it('sets the param, keeps the other params, and removes it when cleared', () => {
    const { result } = renderHook(() => useHarness(), { wrapper: wrapperAt('/search?tab=x') })
    act(() => result.current.setQ('dark'))
    expect(result.current.q).toBe('dark')
    expect(result.current.search).toBe('?tab=x&q=dark')
    act(() => result.current.setQ(''))
    expect(result.current.search).toBe('?tab=x')
  })
})

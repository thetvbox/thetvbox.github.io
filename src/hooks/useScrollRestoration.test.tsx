import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { useScrollRestoration } from './useScrollRestoration'

function PushHarness() {
  const navigate = useNavigate()
  useScrollRestoration()
  return (
    <button type="button" onClick={() => navigate('/second')}>
      go
    </button>
  )
}

function PopHarness() {
  const navigate = useNavigate()
  useScrollRestoration()
  return (
    <button type="button" onClick={() => navigate(-1)}>
      back
    </button>
  )
}

describe('useScrollRestoration', () => {
  let scrollToSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    scrollToSpy = vi.fn()
    window.scrollTo = scrollToSpy as never
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('scrolls to top on a forward (PUSH) navigation', () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={['/first']}>
        <Routes>
          <Route path="*" element={<PushHarness />} />
        </Routes>
      </MemoryRouter>,
    )
    scrollToSpy.mockClear()

    act(() => {
      getByText('go').click()
    })

    expect(scrollToSpy).toHaveBeenCalledWith(expect.objectContaining({ top: 0, left: 0 }))
  })

  it('restores a saved scroll position on back (POP) navigation', () => {
    sessionStorage.setItem('scrollpos:first-key', '250')

    const { getByText } = render(
      <MemoryRouter
        initialEntries={[
          { pathname: '/first', key: 'first-key' },
          { pathname: '/second', key: 'second-key' },
        ]}
        initialIndex={1}
      >
        <Routes>
          <Route path="*" element={<PopHarness />} />
        </Routes>
      </MemoryRouter>,
    )
    scrollToSpy.mockClear()

    act(() => {
      getByText('back').click()
    })

    const numericCalls = scrollToSpy.mock.calls.filter((args) => typeof args[0] === 'number')
    expect(numericCalls[0]).toEqual([0, 250])
  })

  it('restores to 0 on POP when nothing was saved for that page', () => {
    const { getByText } = render(
      <MemoryRouter
        initialEntries={[
          { pathname: '/first', key: 'unsaved-key' },
          { pathname: '/second', key: 'second-key' },
        ]}
        initialIndex={1}
      >
        <Routes>
          <Route path="*" element={<PopHarness />} />
        </Routes>
      </MemoryRouter>,
    )
    scrollToSpy.mockClear()

    act(() => {
      getByText('back').click()
    })

    const numericCalls = scrollToSpy.mock.calls.filter((args) => typeof args[0] === 'number')
    expect(numericCalls[0]).toEqual([0, 0])
  })

  it('saves the current scroll position to sessionStorage on scroll, debounced via rAF', () => {
    let rafCallback: FrameRequestCallback | null = null
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallback = cb
      return 1
    })
    Object.defineProperty(window, 'scrollY', { value: 400, configurable: true })

    function Harness() {
      useScrollRestoration()
      return null
    }

    render(
      <MemoryRouter initialEntries={[{ pathname: '/first', key: 'save-key' }]}>
        <Routes>
          <Route path="*" element={<Harness />} />
        </Routes>
      </MemoryRouter>,
    )

    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })

    expect(rafCallback).not.toBeNull()
    act(() => {
      rafCallback?.(0)
    })

    expect(sessionStorage.getItem('scrollpos:save-key')).toBe('400')
  })

  it('removes its scroll listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    function Harness() {
      useScrollRestoration()
      return null
    }

    const { unmount } = render(
      <MemoryRouter initialEntries={['/first']}>
        <Routes>
          <Route path="*" element={<Harness />} />
        </Routes>
      </MemoryRouter>,
    )
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
  })
})

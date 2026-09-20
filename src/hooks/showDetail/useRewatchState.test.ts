import { useState } from 'react'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/rewatches', async () => {
  const actual = await vi.importActual<typeof import('../../lib/rewatches')>('../../lib/rewatches')
  return {
    ...actual,
    logRewatch: vi.fn(),
    deleteRewatch: vi.fn(),
    restoreRewatch: vi.fn(),
  }
})

import { deleteRewatch, logRewatch, restoreRewatch } from '../../lib/rewatches'
import { useRewatchState } from './useRewatchState'
import type { AppUser, ShowRewatch, TmdbShowDetail } from '../../types'

const user: AppUser = { id: 'u1', email: 'me@example.com', username: 'me', created_at: '2026-01-01T00:00:00Z' }

const show: TmdbShowDetail = {
  id: 100,
  name: 'Show',
  overview: '',
  poster_path: '/poster.jpg',
  backdrop_path: null,
  first_air_date: '2020-01-01',
  genres: [],
  number_of_seasons: 1,
  number_of_episodes: 2,
  status: 'Ended',
  origin_country: ['US'],
  original_language: 'en',
  seasons: [{ id: 1, season_number: 1, name: 'Season 1', episode_count: 2, poster_path: null, air_date: '2020-01-01' }],
}

function rewatchRow(overrides: Partial<ShowRewatch> = {}): ShowRewatch {
  return {
    id: 'row1',
    user_id: 'u1',
    show_id: 100,
    show_name: 'Show',
    show_poster_path: '/poster.jpg',
    rewatched_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function useHarness(
  opts: {
    user?: AppUser | null
    show?: TmdbShowDetail | null
    showError?: (message: string) => void
    showUndo?: (message: string, onUndo: () => void) => void
  } = {},
) {
  const [defaults] = useState(() => ({ showError: vi.fn(), showUndo: vi.fn() }))
  return useRewatchState(
    opts.user === undefined ? user : opts.user,
    opts.show === undefined ? show : opts.show,
    opts.showError ?? defaults.showError,
    opts.showUndo ?? defaults.showUndo,
  )
}

beforeEach(() => {
  vi.mocked(logRewatch).mockReset()
  vi.mocked(deleteRewatch).mockReset().mockResolvedValue(undefined)
  vi.mocked(restoreRewatch).mockReset()
})

describe('useRewatchState', () => {
  it('handleLogRewatch calls logRewatch with the right payload and prepends the saved row, sorted newest-first', async () => {
    const older = rewatchRow({ id: 'older', rewatched_at: '2020-01-01T00:00:00Z' })
    const saved = rewatchRow({ id: 'newest', rewatched_at: '2026-05-01T00:00:00Z' })
    vi.mocked(logRewatch).mockResolvedValue(saved)
    const { result } = renderHook(() => useHarness())

    act(() => result.current.setRewatches([older]))
    await act(() => result.current.handleLogRewatch('2026-05-01T00:00:00Z'))

    expect(logRewatch).toHaveBeenCalledWith({
      userId: 'u1',
      showId: 100,
      showName: 'Show',
      showPosterPath: '/poster.jpg',
      rewatchedAt: '2026-05-01T00:00:00Z',
    })
    expect(result.current.rewatches).toEqual([saved, older])
  })

  it('handleLogRewatch failure calls showError and leaves rewatches unchanged', async () => {
    const existing = rewatchRow()
    vi.mocked(logRewatch).mockRejectedValue(new Error('boom'))
    const showError = vi.fn()
    const { result } = renderHook(() => useHarness({ showError }))

    act(() => result.current.setRewatches([existing]))
    await act(() => result.current.handleLogRewatch('2026-05-01T00:00:00Z'))

    expect(showError).toHaveBeenCalledWith('Failed to log this rewatch. Try again.')
    expect(result.current.rewatches).toEqual([existing])
  })

  it('handleLogRewatch no-ops when user is null', async () => {
    const { result } = renderHook(() => useHarness({ user: null }))

    await act(() => result.current.handleLogRewatch('2026-05-01T00:00:00Z'))

    expect(logRewatch).not.toHaveBeenCalled()
    expect(result.current.rewatches).toEqual([])
  })

  it('handleLogRewatch no-ops when show is null', async () => {
    const { result } = renderHook(() => useHarness({ show: null }))

    await act(() => result.current.handleLogRewatch('2026-05-01T00:00:00Z'))

    expect(logRewatch).not.toHaveBeenCalled()
    expect(result.current.rewatches).toEqual([])
  })

  it('handleDeleteRewatch optimistically removes the row, calls deleteRewatch, then offers undo', async () => {
    const target = rewatchRow({ id: 'target' })
    const other = rewatchRow({ id: 'other', rewatched_at: '2025-01-01T00:00:00Z' })
    const showUndo = vi.fn()
    const { result } = renderHook(() => useHarness({ showUndo }))

    act(() => result.current.setRewatches([target, other]))
    await act(() => result.current.handleDeleteRewatch('target'))

    expect(result.current.rewatches).toEqual([other])
    expect(deleteRewatch).toHaveBeenCalledWith('target')
    expect(showUndo).toHaveBeenCalledWith('Rewatch removed', expect.any(Function))
  })

  it('handleDeleteRewatch failure restores the removed row, re-sorted, and shows an error without offering undo', async () => {
    const target = rewatchRow({ id: 'target', rewatched_at: '2020-01-01T00:00:00Z' })
    const other = rewatchRow({ id: 'other', rewatched_at: '2025-01-01T00:00:00Z' })
    vi.mocked(deleteRewatch).mockRejectedValue(new Error('boom'))
    const showError = vi.fn()
    const showUndo = vi.fn()
    const { result } = renderHook(() => useHarness({ showError, showUndo }))

    act(() => result.current.setRewatches([target, other]))
    await act(() => result.current.handleDeleteRewatch('target'))

    expect(result.current.rewatches).toEqual([other, target])
    expect(showError).toHaveBeenCalledWith('Failed to remove this rewatch. Try again.')
    expect(showUndo).not.toHaveBeenCalled()
  })

  it('handleDeleteRewatch with an unknown id still calls deleteRewatch but does not offer undo', async () => {
    const existing = rewatchRow({ id: 'existing' })
    const showUndo = vi.fn()
    const { result } = renderHook(() => useHarness({ showUndo }))

    act(() => result.current.setRewatches([existing]))
    await act(() => result.current.handleDeleteRewatch('missing'))

    expect(result.current.rewatches).toEqual([existing])
    expect(deleteRewatch).toHaveBeenCalledWith('missing')
    expect(showUndo).not.toHaveBeenCalled()
  })

  it('undo restores the row via restoreRewatch and re-inserts it sorted', async () => {
    const target = rewatchRow({ id: 'target', rewatched_at: '2020-01-01T00:00:00Z' })
    const other = rewatchRow({ id: 'other', rewatched_at: '2025-01-01T00:00:00Z' })
    const restored = rewatchRow({ id: 'restored', rewatched_at: '2020-01-01T00:00:00Z' })
    vi.mocked(restoreRewatch).mockResolvedValue(restored)
    const showUndo = vi.fn()
    const { result } = renderHook(() => useHarness({ showUndo }))

    act(() => result.current.setRewatches([target, other]))
    await act(() => result.current.handleDeleteRewatch('target'))

    await act(() => showUndo.mock.calls[0][1]())

    expect(restoreRewatch).toHaveBeenCalledWith(target)
    expect(result.current.rewatches).toEqual([other, restored])
  })

  it('undo failure shows the undo-specific error message', async () => {
    const target = rewatchRow({ id: 'target' })
    vi.mocked(restoreRewatch).mockRejectedValue(new Error('boom'))
    const showError = vi.fn()
    const showUndo = vi.fn()
    const { result } = renderHook(() => useHarness({ showError, showUndo }))

    act(() => result.current.setRewatches([target]))
    await act(() => result.current.handleDeleteRewatch('target'))

    await act(() => showUndo.mock.calls[0][1]())

    expect(showError).toHaveBeenCalledWith('Failed to undo. Try logging the rewatch again.')
  })
})

import { useState } from 'react'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/watchlist', () => ({ addToWatchlist: vi.fn(), removeFromWatchlist: vi.fn() }))

import { addToWatchlist, removeFromWatchlist } from '../../lib/watchlist'
import { useWatchlistState } from './useWatchlistState'
import type { AppUser, TmdbShowDetail, WatchlistItem } from '../../types'

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
  seasons: [],
}

function watchlistRow(overrides: Partial<WatchlistItem> = {}): WatchlistItem {
  return {
    id: 'w1',
    user_id: 'u1',
    show_id: 100,
    show_name: 'Show',
    show_poster_path: '/poster.jpg',
    added_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
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
  return useWatchlistState(
    opts.user === undefined ? user : opts.user,
    opts.show === undefined ? show : opts.show,
    opts.showError ?? defaults.showError,
    opts.showUndo ?? defaults.showUndo,
  )
}

beforeEach(() => {
  vi.mocked(addToWatchlist).mockReset()
  vi.mocked(removeFromWatchlist).mockReset().mockResolvedValue(undefined)
})

describe('useWatchlistState', () => {
  it('handleToggleWatchlist adds to the watchlist when not already on it', async () => {
    const saved = watchlistRow()
    vi.mocked(addToWatchlist).mockResolvedValue(saved)
    const { result } = renderHook(() => useHarness())

    expect(result.current.watchlistItem).toBeNull()
    await act(() => result.current.handleToggleWatchlist())

    expect(addToWatchlist).toHaveBeenCalledWith({
      userId: 'u1',
      showId: 100,
      showName: 'Show',
      showPosterPath: '/poster.jpg',
    })
    expect(result.current.watchlistItem).toEqual(saved)
  })

  it('handleToggleWatchlist shows an error and leaves watchlistItem null when adding fails', async () => {
    vi.mocked(addToWatchlist).mockRejectedValue(new Error('network down'))
    const showError = vi.fn()
    const { result } = renderHook(() => useHarness({ showError }))

    await act(() => result.current.handleToggleWatchlist())

    expect(showError).toHaveBeenCalledWith('Failed to add to watchlist. Try again.')
    expect(result.current.watchlistItem).toBeNull()
  })

  it('handleToggleWatchlist optimistically clears and offers undo when already on the watchlist', async () => {
    const existing = watchlistRow()
    const showUndo = vi.fn()
    const { result } = renderHook(() => useHarness({ showUndo }))

    act(() => result.current.setWatchlistItem(existing))
    expect(result.current.watchlistItem).toEqual(existing)

    await act(() => result.current.handleToggleWatchlist())

    expect(removeFromWatchlist).toHaveBeenCalledWith('u1', 100)
    expect(result.current.watchlistItem).toBeNull()
    expect(showUndo).toHaveBeenCalledWith('Removed from watchlist', expect.any(Function))
  })

  it('handleToggleWatchlist rolls back and shows an error, without offering undo, when removing fails', async () => {
    const existing = watchlistRow()
    vi.mocked(removeFromWatchlist).mockRejectedValue(new Error('network down'))
    const showError = vi.fn()
    const showUndo = vi.fn()
    const { result } = renderHook(() => useHarness({ showError, showUndo }))

    act(() => result.current.setWatchlistItem(existing))

    await act(() => result.current.handleToggleWatchlist())

    expect(result.current.watchlistItem).toEqual(existing)
    expect(showError).toHaveBeenCalledWith('Failed to remove from watchlist. Try again.')
    expect(showUndo).not.toHaveBeenCalled()
  })

  it('the undo offered after removal re-adds the show and restores watchlistItem to the newly-saved row', async () => {
    const existing = watchlistRow()
    const resaved = watchlistRow({ id: 'w2', added_at: '2026-02-01T00:00:00Z' })
    vi.mocked(addToWatchlist).mockResolvedValue(resaved)
    const showUndo = vi.fn()
    const { result } = renderHook(() => useHarness({ showUndo }))

    act(() => result.current.setWatchlistItem(existing))
    await act(() => result.current.handleToggleWatchlist())

    const onUndo = showUndo.mock.calls[0][1] as () => Promise<void>
    await act(() => onUndo())

    expect(addToWatchlist).toHaveBeenCalledWith({
      userId: 'u1',
      showId: 100,
      showName: 'Show',
      showPosterPath: '/poster.jpg',
    })
    expect(result.current.watchlistItem).toEqual(resaved)
  })

  it('the undo re-add shows an error when it fails', async () => {
    const existing = watchlistRow()
    vi.mocked(addToWatchlist).mockRejectedValue(new Error('network down'))
    const showError = vi.fn()
    const showUndo = vi.fn()
    const { result } = renderHook(() => useHarness({ showError, showUndo }))

    act(() => result.current.setWatchlistItem(existing))
    await act(() => result.current.handleToggleWatchlist())

    const onUndo = showUndo.mock.calls[0][1] as () => Promise<void>
    await act(() => onUndo())

    expect(showError).toHaveBeenCalledWith('Failed to undo. Try adding it to your watchlist again.')
  })

  it('savingWatchlist is true while adding is in flight and false again after it resolves', async () => {
    const { promise, resolve } = deferred<WatchlistItem>()
    vi.mocked(addToWatchlist).mockReturnValue(promise)
    const { result } = renderHook(() => useHarness())

    let toggled: Promise<void>
    act(() => {
      toggled = result.current.handleToggleWatchlist()
    })

    expect(result.current.savingWatchlist).toBe(true)

    await act(async () => {
      resolve(watchlistRow())
      await toggled
    })

    expect(result.current.savingWatchlist).toBe(false)
  })

  it('savingWatchlist goes back to false after a failed add', async () => {
    const { promise, reject } = deferred<WatchlistItem>()
    vi.mocked(addToWatchlist).mockReturnValue(promise)
    const { result } = renderHook(() => useHarness())

    let toggled: Promise<void>
    act(() => {
      toggled = result.current.handleToggleWatchlist()
    })

    expect(result.current.savingWatchlist).toBe(true)

    await act(async () => {
      reject(new Error('network down'))
      await toggled
    })

    expect(result.current.savingWatchlist).toBe(false)
  })

  it('handleToggleWatchlist does nothing when there is no signed-in user', async () => {
    const { result } = renderHook(() => useHarness({ user: null }))

    await act(() => result.current.handleToggleWatchlist())

    expect(addToWatchlist).not.toHaveBeenCalled()
    expect(removeFromWatchlist).not.toHaveBeenCalled()
    expect(result.current.savingWatchlist).toBe(false)
  })

  it('handleToggleWatchlist does nothing when there is no show', async () => {
    const { result } = renderHook(() => useHarness({ show: null }))

    await act(() => result.current.handleToggleWatchlist())

    expect(addToWatchlist).not.toHaveBeenCalled()
    expect(removeFromWatchlist).not.toHaveBeenCalled()
  })

  it('clearWatchlist does nothing when there is no current watchlistItem', () => {
    const { result } = renderHook(() => useHarness())

    result.current.clearWatchlist()

    expect(removeFromWatchlist).not.toHaveBeenCalled()
  })

  it('clearWatchlist does nothing when there is no signed-in user, even with a watchlistItem set', () => {
    const existing = watchlistRow()
    const { result } = renderHook(() => useHarness({ user: null }))

    act(() => result.current.setWatchlistItem(existing))
    result.current.clearWatchlist()

    expect(removeFromWatchlist).not.toHaveBeenCalled()
  })

  it('clearWatchlist removes the item and clears watchlistItem on success', async () => {
    const existing = watchlistRow()
    const { result } = renderHook(() => useHarness())

    act(() => result.current.setWatchlistItem(existing))

    await act(async () => {
      result.current.clearWatchlist()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(removeFromWatchlist).toHaveBeenCalledWith('u1', 100)
    expect(result.current.watchlistItem).toBeNull()
  })

  it('clearWatchlist swallows failure without calling showError', async () => {
    const existing = watchlistRow()
    vi.mocked(removeFromWatchlist).mockRejectedValue(new Error('network down'))
    const showError = vi.fn()
    const { result } = renderHook(() => useHarness({ showError }))

    act(() => result.current.setWatchlistItem(existing))

    await act(async () => {
      expect(() => result.current.clearWatchlist()).not.toThrow()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(showError).not.toHaveBeenCalled()
    expect(result.current.watchlistItem).toEqual(existing)
  })
})

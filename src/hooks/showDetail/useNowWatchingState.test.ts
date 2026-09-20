import { useState } from 'react'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/showDismissed', () => ({ dismissShow: vi.fn(), undismissShow: vi.fn() }))
vi.mock('../../lib/showDropped', () => ({ dropShow: vi.fn(), undropShow: vi.fn() }))
vi.mock('../../lib/showStarted', () => ({ startShow: vi.fn() }))

import { dismissShow, undismissShow } from '../../lib/showDismissed'
import { dropShow, undropShow } from '../../lib/showDropped'
import { startShow } from '../../lib/showStarted'
import { useNowWatchingState } from './useNowWatchingState'
import type { AppUser, ShowDropped, ShowStarted, ShowWatchingDismissed, TmdbShowDetail } from '../../types'

const user: AppUser = { id: 'u1', email: 'me@example.com', username: 'me', created_at: '2026-01-01T00:00:00Z' }

function makeShow(overrides: Partial<TmdbShowDetail> = {}): TmdbShowDetail {
  return {
    id: 100,
    name: 'Show',
    overview: '',
    poster_path: null,
    backdrop_path: null,
    first_air_date: '2020-01-01',
    genres: [],
    number_of_seasons: 1,
    number_of_episodes: 2,
    status: 'Ended',
    origin_country: ['US'],
    original_language: 'en',
    seasons: [{ id: 1, season_number: 1, name: 'Season 1', episode_count: 2, poster_path: null, air_date: '2020-01-01' }],
    ...overrides,
  }
}

const show = makeShow()

/** Flushes the microtask queue inside an act() so promise-chain continuations in the hook settle. */
async function flush() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

function useHarness(
  opts: {
    user?: AppUser | null
    show?: TmdbShowDetail | null
    watchedCount?: number
    showError?: (message: string) => void
    showUndo?: (message: string, onUndo: () => void) => void
    onStarted?: () => void
  } = {},
) {
  const [defaults] = useState(() => ({ showError: vi.fn(), showUndo: vi.fn(), onStarted: vi.fn() }))
  return useNowWatchingState(
    opts.user === undefined ? user : opts.user,
    opts.show === undefined ? show : opts.show,
    opts.watchedCount ?? 0,
    opts.showError ?? defaults.showError,
    opts.showUndo ?? defaults.showUndo,
    opts.onStarted ?? defaults.onStarted,
  )
}

beforeEach(() => {
  vi.mocked(dismissShow).mockReset()
  vi.mocked(undismissShow).mockReset().mockResolvedValue(undefined)
  vi.mocked(dropShow).mockReset()
  vi.mocked(undropShow).mockReset().mockResolvedValue(undefined)
  vi.mocked(startShow).mockReset()
})

describe('useNowWatchingState', () => {
  it('inNowWatching becomes true once watchedCount > 0 and false again once the show is finished', () => {
    const { result, rerender } = renderHook(
      ({ watchedCount }: { watchedCount: number }) => useHarness({ watchedCount }),
      { initialProps: { watchedCount: 0 } },
    )

    expect(result.current.inNowWatching).toBe(false)

    rerender({ watchedCount: 1 })
    expect(result.current.inNowWatching).toBe(true)

    rerender({ watchedCount: 2 }) // number_of_episodes is 2, so this finishes the show
    expect(result.current.inNowWatching).toBe(false)
  })

  it('handleToggleNowWatching starts watching when not in Now Watching and not dismissed', async () => {
    const startedRow: ShowStarted = {
      id: 's1', user_id: 'u1', show_id: 100, show_name: 'Show', show_poster_path: null,
      show_total_episodes: 2, started_at: '2026-01-01T00:00:00Z',
    }
    vi.mocked(startShow).mockResolvedValue(startedRow)
    const onStarted = vi.fn()
    const { result } = renderHook(() => useHarness({ onStarted }))

    act(() => { result.current.handleToggleNowWatching() })
    await flush()

    expect(startShow).toHaveBeenCalledWith({
      userId: 'u1', showId: 100, showName: 'Show', showPosterPath: null, showTotalEpisodes: 2,
    })
    expect(result.current.started).toEqual(startedRow)
    expect(onStarted).toHaveBeenCalledTimes(1)
    // handleStartWatching also best-effort clears any dismissed/dropped state on success
    expect(undismissShow).toHaveBeenCalledWith('u1', 100)
    expect(undropShow).toHaveBeenCalledWith('u1', 100)
  })

  it('handleStartWatching shows an error and leaves started null on failure', async () => {
    vi.mocked(startShow).mockRejectedValue(new Error('boom'))
    const showError = vi.fn()
    const { result } = renderHook(() => useHarness({ showError }))

    act(() => { result.current.handleToggleNowWatching() })
    await flush()

    expect(result.current.started).toBeNull()
    expect(showError).toHaveBeenCalledWith('Failed to start watching. Try again.')
  })

  it('handleToggleNowWatching removes from Now Watching optimistically, replaces with the saved row, and offers undo', async () => {
    const saved: ShowWatchingDismissed = { id: 'row1', user_id: 'u1', show_id: 100, dismissed_at: '2026-02-01T00:00:00Z' }
    vi.mocked(dismissShow).mockResolvedValue(saved)
    const showUndo = vi.fn()
    const { result } = renderHook(() => useHarness({ watchedCount: 1, showUndo }))

    expect(result.current.inNowWatching).toBe(true)

    act(() => { result.current.handleToggleNowWatching() })
    expect(result.current.dismissedItem).toMatchObject({ id: 'optimistic-100', user_id: 'u1', show_id: 100 })

    await flush()

    expect(dismissShow).toHaveBeenCalledWith('u1', 100)
    expect(result.current.dismissedItem).toEqual(saved)
    expect(showUndo).toHaveBeenCalledWith('Removed from Now Watching', expect.any(Function))

    await act(() => showUndo.mock.calls[0][1]())

    expect(undismissShow).toHaveBeenCalledWith('u1', 100)
    expect(result.current.dismissedItem).toBeNull()
  })

  it('handleRemoveFromNowWatching rolls back and shows an error when dismissShow fails', async () => {
    vi.mocked(dismissShow).mockRejectedValue(new Error('network down'))
    const showError = vi.fn()
    const { result } = renderHook(() => useHarness({ watchedCount: 1, showError }))

    act(() => { result.current.handleToggleNowWatching() })
    expect(result.current.dismissedItem).not.toBeNull()

    await flush()

    expect(result.current.dismissedItem).toBeNull()
    expect(showError).toHaveBeenCalledWith('Failed to remove from Now Watching. Try again.')
  })

  it('handleToggleNowWatching adds back to Now Watching when dismissed', async () => {
    const dismissedRow: ShowWatchingDismissed = { id: 'd1', user_id: 'u1', show_id: 100, dismissed_at: '2026-01-01T00:00:00Z' }
    const { result } = renderHook(() => useHarness({ watchedCount: 0 }))

    act(() => { result.current.setDismissedItem(dismissedRow) })
    expect(result.current.dismissedItem).toEqual(dismissedRow)
    expect(result.current.inNowWatching).toBe(false)

    act(() => { result.current.handleToggleNowWatching() })
    await flush()

    expect(undismissShow).toHaveBeenCalledWith('u1', 100)
    expect(result.current.dismissedItem).toBeNull()
  })

  it('handleAddBackToNowWatching rolls back and shows an error on failure', async () => {
    const dismissedRow: ShowWatchingDismissed = { id: 'd1', user_id: 'u1', show_id: 100, dismissed_at: '2026-01-01T00:00:00Z' }
    vi.mocked(undismissShow).mockRejectedValue(new Error('nope'))
    const showError = vi.fn()
    const { result } = renderHook(() => useHarness({ watchedCount: 0, showError }))

    act(() => { result.current.setDismissedItem(dismissedRow) })
    act(() => { result.current.handleToggleNowWatching() })
    await flush()

    expect(result.current.dismissedItem).toEqual(dismissedRow)
    expect(showError).toHaveBeenCalledWith('Failed to add back to Now Watching. Try again.')
  })

  it('handleToggleDropped drops the show optimistically, replaces with the saved row, and offers undo', async () => {
    const saved: ShowDropped = {
      id: 'row1', user_id: 'u1', show_id: 100, show_name: 'Show', show_poster_path: null, dropped_at: '2026-02-01T00:00:00Z',
    }
    vi.mocked(dropShow).mockResolvedValue(saved)
    const showUndo = vi.fn()
    const { result } = renderHook(() => useHarness({ watchedCount: 1, showUndo }))

    act(() => { result.current.handleToggleDropped() })
    expect(result.current.droppedItem).toMatchObject({ id: 'optimistic-100', user_id: 'u1', show_id: 100, show_name: 'Show' })

    await flush()

    expect(dropShow).toHaveBeenCalledWith({ userId: 'u1', showId: 100, showName: 'Show', showPosterPath: null })
    expect(result.current.droppedItem).toEqual(saved)
    expect(showUndo).toHaveBeenCalledWith('Dropped this show', expect.any(Function))

    await act(() => showUndo.mock.calls[0][1]())

    expect(undropShow).toHaveBeenCalledWith('u1', 100)
    expect(result.current.droppedItem).toBeNull()
  })

  it('handleDropShow rolls back and shows an error when dropShow fails', async () => {
    vi.mocked(dropShow).mockRejectedValue(new Error('nope'))
    const showError = vi.fn()
    const { result } = renderHook(() => useHarness({ watchedCount: 1, showError }))

    act(() => { result.current.handleToggleDropped() })
    expect(result.current.droppedItem).not.toBeNull()

    await flush()

    expect(result.current.droppedItem).toBeNull()
    expect(showError).toHaveBeenCalledWith('Failed to drop this show. Try again.')
  })

  it('handleToggleDropped resumes from dropped when already dropped', async () => {
    const droppedRow: ShowDropped = {
      id: 'd1', user_id: 'u1', show_id: 100, show_name: 'Show', show_poster_path: null, dropped_at: '2026-01-01T00:00:00Z',
    }
    const { result } = renderHook(() => useHarness({ watchedCount: 1 }))

    act(() => { result.current.setDroppedItem(droppedRow) })
    expect(result.current.droppedItem).toEqual(droppedRow)

    act(() => { result.current.handleToggleDropped() })
    await flush()

    expect(undropShow).toHaveBeenCalledWith('u1', 100)
    expect(result.current.droppedItem).toBeNull()
  })

  it('handleResumeFromDropped rolls back and shows an error on failure', async () => {
    const droppedRow: ShowDropped = {
      id: 'd1', user_id: 'u1', show_id: 100, show_name: 'Show', show_poster_path: null, dropped_at: '2026-01-01T00:00:00Z',
    }
    vi.mocked(undropShow).mockRejectedValue(new Error('nope'))
    const showError = vi.fn()
    const { result } = renderHook(() => useHarness({ watchedCount: 1, showError }))

    act(() => { result.current.setDroppedItem(droppedRow) })
    act(() => { result.current.handleToggleDropped() })
    await flush()

    expect(result.current.droppedItem).toEqual(droppedRow)
    expect(showError).toHaveBeenCalledWith('Failed to resume this show. Try again.')
  })

  it('undo after removing from Now Watching shows an error when undismissShow fails', async () => {
    const saved: ShowWatchingDismissed = { id: 'row1', user_id: 'u1', show_id: 100, dismissed_at: '2026-02-01T00:00:00Z' }
    vi.mocked(dismissShow).mockResolvedValue(saved)
    vi.mocked(undismissShow).mockRejectedValue(new Error('nope'))
    const showUndo = vi.fn()
    const showError = vi.fn()
    const { result } = renderHook(() => useHarness({ watchedCount: 1, showUndo, showError }))

    act(() => { result.current.handleToggleNowWatching() })
    await flush()

    expect(showUndo).toHaveBeenCalledWith('Removed from Now Watching', expect.any(Function))

    await act(() => showUndo.mock.calls[0][1]())

    expect(result.current.dismissedItem).toEqual(saved)
    expect(showError).toHaveBeenCalledWith('Failed to undo. Try again.')
  })

  it('undo after dropping shows an error when undropShow fails', async () => {
    const saved: ShowDropped = {
      id: 'row1', user_id: 'u1', show_id: 100, show_name: 'Show', show_poster_path: null, dropped_at: '2026-02-01T00:00:00Z',
    }
    vi.mocked(dropShow).mockResolvedValue(saved)
    vi.mocked(undropShow).mockRejectedValue(new Error('nope'))
    const showUndo = vi.fn()
    const showError = vi.fn()
    const { result } = renderHook(() => useHarness({ watchedCount: 1, showUndo, showError }))

    act(() => { result.current.handleToggleDropped() })
    await flush()

    expect(showUndo).toHaveBeenCalledWith('Dropped this show', expect.any(Function))

    await act(() => showUndo.mock.calls[0][1]())

    expect(result.current.droppedItem).toEqual(saved)
    expect(showError).toHaveBeenCalledWith('Failed to undo. Try again.')
  })

  it('canTrackNowWatching and canDropShow reflect episode totals and progress', () => {
    const zeroEpisodeShow = makeShow({ number_of_episodes: 0 })
    const { result: zero } = renderHook(() => useHarness({ show: zeroEpisodeShow, watchedCount: 0 }))
    expect(zero.current.canTrackNowWatching).toBe(false)
    expect(zero.current.canDropShow).toBe(false)

    const { result: finished } = renderHook(() => useHarness({ watchedCount: 2 })) // show has 2 total episodes
    expect(finished.current.canTrackNowWatching).toBe(false)
    expect(finished.current.canDropShow).toBe(false)

    const { result: inProgress } = renderHook(() => useHarness({ watchedCount: 1 }))
    expect(inProgress.current.canTrackNowWatching).toBe(true)
    expect(inProgress.current.canDropShow).toBe(true)

    const { result: notStarted } = renderHook(() => useHarness({ watchedCount: 0 }))
    expect(notStarted.current.canTrackNowWatching).toBe(true)
    expect(notStarted.current.canDropShow).toBe(false)
  })

  it('clearDismissed clears dismissedItem on success', async () => {
    const dismissedRow: ShowWatchingDismissed = { id: 'x1', user_id: 'u1', show_id: 100, dismissed_at: '2026-01-01T00:00:00Z' }
    const showError = vi.fn()
    const { result } = renderHook(() => useHarness({ showError }))

    act(() => { result.current.setDismissedItem(dismissedRow) })
    act(() => { result.current.clearDismissed() })
    await flush()

    expect(result.current.dismissedItem).toBeNull()
    expect(showError).not.toHaveBeenCalled()
  })

  it('clearDropped silently ignores failure and leaves droppedItem untouched', async () => {
    const droppedRow: ShowDropped = {
      id: 'd1', user_id: 'u1', show_id: 100, show_name: 'Show', show_poster_path: null, dropped_at: '2026-01-01T00:00:00Z',
    }
    vi.mocked(undropShow).mockRejectedValue(new Error('nope'))
    const showError = vi.fn()
    const { result } = renderHook(() => useHarness({ showError }))

    act(() => { result.current.setDroppedItem(droppedRow) })
    act(() => { result.current.clearDropped() })
    await flush()

    expect(result.current.droppedItem).toEqual(droppedRow)
    expect(showError).not.toHaveBeenCalled()
  })

  it('all handlers no-op when user is null', async () => {
    const { result } = renderHook(() => useHarness({ user: null, watchedCount: 1 }))

    act(() => {
      result.current.handleToggleNowWatching()
      result.current.handleToggleDropped()
      result.current.clearDismissed()
      result.current.clearDropped()
    })
    await flush()

    expect(startShow).not.toHaveBeenCalled()
    expect(dismissShow).not.toHaveBeenCalled()
    expect(undismissShow).not.toHaveBeenCalled()
    expect(dropShow).not.toHaveBeenCalled()
    expect(undropShow).not.toHaveBeenCalled()
    expect(result.current.started).toBeNull()
    expect(result.current.dismissedItem).toBeNull()
    expect(result.current.droppedItem).toBeNull()
  })
})

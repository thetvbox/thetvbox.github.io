import { useState } from 'react'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/tmdb', () => ({ getSeasonDetail: vi.fn() }))
vi.mock('../../lib/watched', async () => {
  const actual = await vi.importActual<typeof import('../../lib/watched')>('../../lib/watched')
  return {
    ...actual,
    markWatched: vi.fn(),
    unmarkWatched: vi.fn(),
    bulkMarkWatched: vi.fn(),
    bulkUnmarkWatched: vi.fn(),
    restoreWatched: vi.fn(),
  }
})

import { bulkMarkWatched, bulkUnmarkWatched, markWatched, restoreWatched, unmarkWatched } from '../../lib/watched'
import { useEpisodeWatchHandlers } from './useEpisodeWatchHandlers'
import type { AppUser, EpisodeWatched, TmdbSeasonDetail, TmdbShowDetail, WatchedMap } from '../../types'

const user: AppUser = { id: 'u1', email: 'me@example.com', username: 'me', created_at: '2026-01-01T00:00:00Z' }

const show: TmdbShowDetail = {
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
}

function watchedRow(overrides: Partial<EpisodeWatched> = {}): EpisodeWatched {
  return {
    id: 'row1',
    user_id: 'u1',
    show_id: 100,
    show_name: 'Show',
    show_poster_path: null,
    show_total_episodes: 2,
    season_number: 1,
    episode_number: 1,
    episode_name: 'Pilot',
    watched_at: '2026-01-01T00:00:00Z',
    watched_at_unknown: false,
    runtime_minutes: 42,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function season(episodes: TmdbSeasonDetail['episodes'] = []): TmdbSeasonDetail {
  return { id: 1, season_number: 1, name: 'Season 1', episodes }
}

function useHarness(
  initialWatched: WatchedMap,
  opts: {
    user?: AppUser | null
    activeSeason?: number | null
    season?: TmdbSeasonDetail | null
    showError?: (message: string) => void
    showUndo?: (message: string, onUndo: () => void) => void
    onProgress?: () => void
  } = {},
) {
  const [watched, setWatched] = useState(initialWatched)
  const [defaults] = useState(() => ({ showError: vi.fn(), showUndo: vi.fn(), onProgress: vi.fn() }))
  const handlers = useEpisodeWatchHandlers(
    watched,
    setWatched,
    opts.user === undefined ? user : opts.user,
    show,
    opts.activeSeason ?? 1,
    opts.season ?? season(),
    opts.showError ?? defaults.showError,
    opts.showUndo ?? defaults.showUndo,
    opts.onProgress ?? defaults.onProgress,
  )
  return { watched, ...handlers }
}

beforeEach(() => {
  vi.mocked(markWatched).mockReset()
  vi.mocked(unmarkWatched).mockReset().mockResolvedValue(undefined)
  vi.mocked(bulkMarkWatched).mockReset()
  vi.mocked(bulkUnmarkWatched).mockReset().mockResolvedValue(undefined)
  vi.mocked(restoreWatched).mockReset().mockResolvedValue([])
})

describe('useEpisodeWatchHandlers', () => {
  it('handleToggleWatched marks an unwatched episode watched, optimistically then with the saved row', async () => {
    const saved = watchedRow({ id: 'saved-1' })
    vi.mocked(markWatched).mockResolvedValue(saved)
    const onProgress = vi.fn()
    const { result } = renderHook(() => useHarness({}, { onProgress }))

    await act(() => result.current.handleToggleWatched(1, 'Pilot', 42))

    expect(result.current.watched['1-1']).toEqual(saved)
    expect(onProgress).toHaveBeenCalled()
  })

  it('handleToggleWatched unmarks a watched episode', async () => {
    const { result } = renderHook(() => useHarness({ '1-1': watchedRow() }))

    await act(() => result.current.handleToggleWatched(1, 'Pilot', 42))

    expect(result.current.watched['1-1']).toBeUndefined()
    expect(unmarkWatched).toHaveBeenCalledWith('u1', 100, 1, 1)
  })

  it('handleToggleWatched rolls back and shows an error when marking watched fails', async () => {
    vi.mocked(markWatched).mockRejectedValue(new Error('network down'))
    const showError = vi.fn()
    const { result } = renderHook(() => useHarness({}, { showError }))

    await act(() => result.current.handleToggleWatched(1, 'Pilot', 42))

    expect(result.current.watched['1-1']).toBeUndefined()
    expect(showError).toHaveBeenCalledWith('Failed to mark this episode watched. Try again.')
  })

  it('handleToggleWatched rolls back and shows an error when unmarking fails', async () => {
    vi.mocked(unmarkWatched).mockRejectedValue(new Error('network down'))
    const previous = watchedRow()
    const showError = vi.fn()
    const { result } = renderHook(() => useHarness({ '1-1': previous }, { showError }))

    await act(() => result.current.handleToggleWatched(1, 'Pilot', 42))

    expect(result.current.watched['1-1']).toEqual(previous)
    expect(showError).toHaveBeenCalledWith('Failed to unmark this episode. Try again.')
  })

  it('handleToggleWatched does nothing when signed out', async () => {
    const { result } = renderHook(() => useHarness({}, { user: null }))

    await act(() => result.current.handleToggleWatched(1, 'Pilot', 42))

    expect(markWatched).not.toHaveBeenCalled()
    expect(result.current.watched).toEqual({})
  })

  it('handleToggleWatched keeps a stable identity across a watched-state change it causes itself', async () => {
    vi.mocked(markWatched).mockResolvedValue(watchedRow())
    const { result } = renderHook(() => useHarness({}))

    const before = result.current.handleToggleWatched
    await act(() => result.current.handleToggleWatched(1, 'Pilot', 42))

    expect(result.current.watched['1-1']).toBeDefined()
    expect(result.current.handleToggleWatched).toBe(before)
  })

  it('handleMarkWatchedWithDate marks a specific episode watched on a chosen date and calls onProgress', async () => {
    const saved = watchedRow({ watched_at: '2020-06-01T00:00:00Z' })
    vi.mocked(bulkMarkWatched).mockResolvedValue([saved])
    const onProgress = vi.fn()
    const { result } = renderHook(() => useHarness({}, { onProgress }))

    await act(() =>
      result.current.handleMarkWatchedWithDate(1, 'Pilot', 42, { watchedAt: '2020-06-01T00:00:00Z', unknownDate: false }),
    )

    expect(bulkMarkWatched).toHaveBeenCalledWith(
      expect.objectContaining({ episodes: [{ seasonNumber: 1, episodeNumber: 1, episodeName: 'Pilot', runtimeMinutes: 42 }] }),
    )
    expect(result.current.watched['1-1']).toEqual(saved)
    expect(onProgress).toHaveBeenCalled()
  })

  it('handleMarkWatchedWithDate shows an error and leaves state untouched on failure', async () => {
    vi.mocked(bulkMarkWatched).mockRejectedValue(new Error('boom'))
    const showError = vi.fn()
    const { result } = renderHook(() => useHarness({}, { showError }))

    await act(() =>
      result.current.handleMarkWatchedWithDate(1, 'Pilot', 42, { watchedAt: '2020-06-01T00:00:00Z', unknownDate: false }),
    )

    expect(result.current.watched).toEqual({})
    expect(showError).toHaveBeenCalledWith('Failed to mark this episode watched. Try again.')
  })

  it('handleMarkSeasonWatched skips unaired episodes, offers undo, and the undo removes the newly-created row', async () => {
    const aired = { id: 1, episode_number: 1, season_number: 1, name: 'E1', overview: '', still_path: null, air_date: '2020-01-01', runtime: 42 }
    const future = { id: 2, episode_number: 2, season_number: 1, name: 'E2', overview: '', still_path: null, air_date: '2099-12-25', runtime: 42 }
    const saved = watchedRow({ episode_number: 1, episode_name: 'E1' })
    vi.mocked(bulkMarkWatched).mockResolvedValue([saved])
    const showUndo = vi.fn()
    const { result } = renderHook(() => useHarness({}, { season: season([aired, future]), showUndo }))

    await act(() => result.current.handleMarkSeasonWatched({ watchedAt: '2020-02-01T00:00:00Z', unknownDate: false }))

    expect(bulkMarkWatched).toHaveBeenCalledWith(
      expect.objectContaining({ episodes: [{ seasonNumber: 1, episodeNumber: 1, episodeName: 'E1', runtimeMinutes: 42 }] }),
    )
    expect(result.current.watched['1-1']).toEqual(saved)
    expect(showUndo).toHaveBeenCalledWith('Marked 1 episodes watched', expect.any(Function))

    await act(() => showUndo.mock.calls[0][1]())

    expect(bulkUnmarkWatched).toHaveBeenCalledWith('u1', 100, [{ seasonNumber: 1, episodeNumber: 1 }])
    expect(result.current.watched['1-1']).toBeUndefined()
  })

  it('seasonWatchedCount counts only the active season episodes present in watched', () => {
    const aired = { id: 1, episode_number: 1, season_number: 1, name: 'E1', overview: '', still_path: null, air_date: '2020-01-01', runtime: 42 }
    const other = { id: 2, episode_number: 2, season_number: 1, name: 'E2', overview: '', still_path: null, air_date: '2020-01-08', runtime: 42 }
    const { result } = renderHook(() =>
      useHarness({ '1-1': watchedRow() }, { season: season([aired, other]) }),
    )

    expect(result.current.seasonWatchedCount).toBe(1)
  })
})

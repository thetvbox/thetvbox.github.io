import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useShowDetail } from './useShowDetail'
import type { AppUser, TmdbShowDetail } from '../types'

vi.mock('../lib/tmdb', () => ({
  getShowDetail: vi.fn(),
  getSeasonDetail: vi.fn(),
  getWatchProviders: vi.fn(() => Promise.resolve(null)),
  detectRegion: vi.fn(() => 'US'),
}))
vi.mock('../lib/showRatings', () => ({
  fetchAllShowRatings: vi.fn(() => Promise.resolve([])),
  upsertShowRating: vi.fn(),
  deleteShowRating: vi.fn(),
}))
vi.mock('../lib/seasonRatings', () => ({
  fetchAllSeasonRatingsForShow: vi.fn(() => Promise.resolve([])),
  upsertSeasonRating: vi.fn(),
  deleteSeasonRating: vi.fn(),
}))
vi.mock('../lib/watched', () => ({
  fetchWatchedForShow: vi.fn(() => Promise.resolve({})),
  markWatched: vi.fn(),
  unmarkWatched: vi.fn(),
  bulkMarkWatched: vi.fn(),
  bulkUnmarkWatched: vi.fn(),
  restoreWatched: vi.fn(),
  watchedKey: (s: number, e: number) => `${s}-${e}`,
}))
vi.mock('../lib/streamingOverrides', () => ({
  fetchStreamingOverride: vi.fn(() => Promise.resolve(null)),
  setStreamingOverride: vi.fn(),
  clearStreamingOverride: vi.fn(),
}))
vi.mock('../lib/streamingProvider', () => ({
  pickBestFreeProvider: vi.fn(() => null),
  invalidatePlatformCache: vi.fn(),
}))
vi.mock('../lib/watchlist', () => ({
  fetchWatchlistItem: vi.fn(() => Promise.resolve(null)),
  addToWatchlist: vi.fn(),
  removeFromWatchlist: vi.fn(() => Promise.resolve()),
}))
vi.mock('../lib/showStarted', () => ({
  fetchStartedItem: vi.fn(() => Promise.resolve(null)),
  startShow: vi.fn(),
}))
vi.mock('../lib/showDismissed', () => ({
  fetchDismissedItem: vi.fn(() => Promise.resolve(null)),
  dismissShow: vi.fn(),
  undismissShow: vi.fn(() => Promise.resolve()),
}))
vi.mock('../lib/showDropped', () => ({
  fetchDroppedItem: vi.fn(() => Promise.resolve(null)),
  dropShow: vi.fn(),
  undropShow: vi.fn(() => Promise.resolve()),
}))
vi.mock('../lib/rewatches', () => ({
  fetchRewatchesForShow: vi.fn(() => Promise.resolve([])),
  logRewatch: vi.fn(),
  deleteRewatch: vi.fn(),
  restoreRewatch: vi.fn(),
  sortRewatchesDesc: (arr: unknown[]) => arr,
}))
vi.mock('../lib/lists', () => ({
  fetchListMembershipForShow: vi.fn(() => Promise.resolve(new Set())),
}))
vi.mock('../lib/tvmaze', () => ({
  getCorrectedAirDates: vi.fn(() => Promise.resolve(new Map())),
  tvmazeEpisodeKey: (s: number, e: number) => `${s}-${e}`,
}))

import { getShowDetail, getSeasonDetail } from '../lib/tmdb'
import { fetchAllSeasonRatingsForShow } from '../lib/seasonRatings'
import { fetchDismissedItem, undismissShow } from '../lib/showDismissed'
import { fetchDroppedItem, undropShow } from '../lib/showDropped'
import { fetchWatchlistItem, removeFromWatchlist } from '../lib/watchlist'
import { fetchStartedItem, startShow } from '../lib/showStarted'
import { bulkMarkWatched, fetchWatchedForShow, markWatched, unmarkWatched } from '../lib/watched'
import { deleteShowRating, upsertShowRating } from '../lib/showRatings'
import { upsertSeasonRating } from '../lib/seasonRatings'
import { addToWatchlist } from '../lib/watchlist'
import { dismissShow } from '../lib/showDismissed'
import { dropShow } from '../lib/showDropped'
import { deleteRewatch, logRewatch, restoreRewatch } from '../lib/rewatches'
import { setStreamingOverride, clearStreamingOverride } from '../lib/streamingOverrides'

function makeShow(overrides: Partial<TmdbShowDetail> = {}): TmdbShowDetail {
  return {
    id: 1,
    name: 'Show One',
    overview: '',
    poster_path: null,
    backdrop_path: null,
    first_air_date: '2020-01-01',
    genres: [],
    number_of_seasons: 1,
    number_of_episodes: 10,
    status: 'Ended',
    origin_country: ['US'],
    original_language: 'en',
    seasons: [{ id: 1, season_number: 1, name: 'Season 1', episode_count: 10, poster_path: null, air_date: '2020-01-01' }],
    ...overrides,
  }
}

const user: AppUser = { id: 'u1', email: 'tester@example.com', username: 'tester', created_at: '2020-01-01T00:00:00Z' }

function watchedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ep1',
    user_id: 'u1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    show_total_episodes: 10,
    season_number: 1,
    episode_number: 1,
    episode_name: 'Pilot',
    watched_at: '2026-01-01T00:00:00Z',
    watched_at_unknown: false,
    runtime_minutes: 30,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  // Re-establish every mock's safe default so a previous test's override can't leak into the next.
  vi.mocked(getShowDetail).mockResolvedValue(makeShow())
  vi.mocked(getSeasonDetail).mockResolvedValue({
    id: 1,
    season_number: 1,
    name: 'Season 1',
    episodes: [{ id: 1, season_number: 1, episode_number: 1, name: 'Pilot', overview: '', air_date: '2020-01-01', runtime: 30, still_path: null }],
  })
  vi.mocked(fetchWatchedForShow).mockResolvedValue({})
  vi.mocked(fetchDismissedItem).mockResolvedValue(null)
  vi.mocked(fetchDroppedItem).mockResolvedValue(null)
  vi.mocked(fetchWatchlistItem).mockResolvedValue(null)
  vi.mocked(fetchStartedItem).mockResolvedValue(null)
  vi.mocked(undismissShow).mockResolvedValue(undefined)
  vi.mocked(undropShow).mockResolvedValue(undefined)
  vi.mocked(removeFromWatchlist).mockResolvedValue(undefined)
})

describe('useShowDetail', () => {
  it('loads show data and defaults activeSeason to the first real season', async () => {
    const { result } = renderHook(() => useShowDetail(1, user))
    await waitFor(() => expect(result.current.loadingShow).toBe(false))
    expect(result.current.show?.id).toBe(1)
    expect(result.current.activeSeason).toBe(1)
  })

  it('marking an episode watched resumes a dismissed, dropped, and watchlisted show', async () => {
    vi.mocked(fetchDismissedItem).mockResolvedValue({
      id: 'd1',
      user_id: 'u1',
      show_id: 1,
      dismissed_at: '2026-01-01T00:00:00Z',
    })
    vi.mocked(fetchDroppedItem).mockResolvedValue({
      id: 'dr1',
      user_id: 'u1',
      show_id: 1,
      show_name: 'Show One',
      show_poster_path: null,
      dropped_at: '2026-01-01T00:00:00Z',
    })
    vi.mocked(fetchWatchlistItem).mockResolvedValue({
      id: 'w1',
      user_id: 'u1',
      show_id: 1,
      show_name: 'Show One',
      show_poster_path: null,
      added_at: '2026-01-01T00:00:00Z',
    })
    vi.mocked(markWatched).mockResolvedValue({
      id: 'ep1',
      user_id: 'u1',
      show_id: 1,
      show_name: 'Show One',
      show_poster_path: null,
      show_total_episodes: 10,
      season_number: 1,
      episode_number: 1,
      episode_name: 'Pilot',
      watched_at: '2026-01-01T00:00:00Z',
      watched_at_unknown: false,
      runtime_minutes: 30,
      created_at: '2026-01-01T00:00:00Z',
    })

    const { result } = renderHook(() => useShowDetail(1, user))
    await waitFor(() => expect(result.current.loadingShow).toBe(false))
    expect(result.current.dismissedItem).not.toBeNull()
    expect(result.current.droppedItem).not.toBeNull()
    expect(result.current.watchlistItem).not.toBeNull()

    await act(async () => {
      await result.current.handleToggleWatched(1, 'Pilot', 30)
    })

    expect(undismissShow).toHaveBeenCalledWith('u1', 1)
    expect(undropShow).toHaveBeenCalledWith('u1', 1)
    expect(removeFromWatchlist).toHaveBeenCalledWith('u1', 1)
  })

  it('starting a show from scratch resumes an active watchlist entry too', async () => {
    vi.mocked(fetchWatchlistItem).mockResolvedValue({
      id: 'w1',
      user_id: 'u1',
      show_id: 1,
      show_name: 'Show One',
      show_poster_path: null,
      added_at: '2026-01-01T00:00:00Z',
    })
    vi.mocked(startShow).mockResolvedValue({
      id: 's1',
      user_id: 'u1',
      show_id: 1,
      show_name: 'Show One',
      show_poster_path: null,
      show_total_episodes: 10,
      started_at: '2026-01-01T00:00:00Z',
    })

    const { result } = renderHook(() => useShowDetail(1, user))
    await waitFor(() => expect(result.current.loadingShow).toBe(false))
    expect(result.current.watchlistItem).not.toBeNull()

    await act(async () => {
      result.current.handleToggleNowWatching()
    })
    await waitFor(() => expect(result.current.savingNowWatching).toBe(false))

    expect(startShow).toHaveBeenCalled()
    expect(removeFromWatchlist).toHaveBeenCalledWith('u1', 1)
  })

  it('exposes no user gracefully: skips user-scoped fetches and mutation handlers no-op', async () => {
    const { result } = renderHook(() => useShowDetail(1, null))
    await waitFor(() => expect(result.current.loadingShow).toBe(false))
    expect(result.current.watched).toEqual({})
    await act(async () => {
      await result.current.handleToggleWatched(1, 'Pilot', 30)
    })
    expect(markWatched).not.toHaveBeenCalled()
  })

  it('surfaces a load error without crashing', async () => {
    vi.mocked(getShowDetail).mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useShowDetail(1, user))
    await waitFor(() => expect(result.current.loadingShow).toBe(false))
    expect(result.current.error).toBe('boom')
    expect(result.current.show).toBeNull()
  })

  it('unmarks an already-watched episode and removes it from state', async () => {
    vi.mocked(fetchWatchedForShow).mockResolvedValue({ '1-1': watchedRow() })
    vi.mocked(unmarkWatched).mockResolvedValue(undefined)

    const { result } = renderHook(() => useShowDetail(1, user))
    await waitFor(() => expect(result.current.loadingShow).toBe(false))
    expect(result.current.watched['1-1']).toBeDefined()

    await act(async () => {
      await result.current.handleToggleWatched(1, 'Pilot', 30)
    })

    expect(unmarkWatched).toHaveBeenCalledWith('u1', 1, 1, 1)
    expect(result.current.watched['1-1']).toBeUndefined()
  })

  it('rolls back the optimistic mark and shows an error toast when markWatched fails', async () => {
    vi.mocked(markWatched).mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() => useShowDetail(1, user))
    await waitFor(() => expect(result.current.loadingShow).toBe(false))

    await act(async () => {
      await result.current.handleToggleWatched(1, 'Pilot', 30)
    })

    expect(result.current.watched['1-1']).toBeUndefined()
    expect(result.current.toast?.tone).toBe('error')
  })

  it('handleMarkAllWatched bulk-marks every real season and offers an undo', async () => {
    vi.mocked(bulkMarkWatched).mockResolvedValue([watchedRow()])

    const { result } = renderHook(() => useShowDetail(1, user))
    await waitFor(() => expect(result.current.loadingShow).toBe(false))

    await act(async () => {
      await result.current.handleMarkAllWatched({ watchedAt: '2026-01-01T00:00:00Z', unknownDate: false })
    })

    expect(bulkMarkWatched).toHaveBeenCalled()
    expect(result.current.watched['1-1']).toBeDefined()
    expect(result.current.toast?.action?.label).toBe('Undo')
  })

  it('handleMarkSeasonWatched marks the active season and merges results into watched', async () => {
    vi.mocked(bulkMarkWatched).mockResolvedValue([watchedRow()])

    const { result } = renderHook(() => useShowDetail(1, user))
    await waitFor(() => expect(result.current.loadingShow).toBe(false))
    await waitFor(() => expect(result.current.loadingSeason).toBe(false))

    await act(async () => {
      await result.current.handleMarkSeasonWatched({ watchedAt: '2026-01-01T00:00:00Z', unknownDate: false })
    })

    expect(result.current.watched['1-1']).toBeDefined()
  })

  it('handleMarkWatchedWithDate marks a single episode on a specific date', async () => {
    vi.mocked(bulkMarkWatched).mockResolvedValue([watchedRow()])

    const { result } = renderHook(() => useShowDetail(1, user))
    await waitFor(() => expect(result.current.loadingShow).toBe(false))

    await act(async () => {
      await result.current.handleMarkWatchedWithDate(1, 'Pilot', 30, {
        watchedAt: '2025-06-01T00:00:00Z',
        unknownDate: false,
      })
    })

    expect(result.current.watched['1-1']).toBeDefined()
  })

  it('handleToggleWatchlist adds to the watchlist when not already on it', async () => {
    vi.mocked(addToWatchlist).mockResolvedValue({
      id: 'w1',
      user_id: 'u1',
      show_id: 1,
      show_name: 'Show One',
      show_poster_path: null,
      added_at: '2026-01-01T00:00:00Z',
    })

    const { result } = renderHook(() => useShowDetail(1, user))
    await waitFor(() => expect(result.current.loadingShow).toBe(false))
    expect(result.current.watchlistItem).toBeNull()

    await act(async () => {
      await result.current.handleToggleWatchlist()
    })

    expect(addToWatchlist).toHaveBeenCalled()
    expect(result.current.watchlistItem).not.toBeNull()
  })

  it('handleToggleWatchlist removes and offers an undo that restores it', async () => {
    vi.mocked(fetchWatchlistItem).mockResolvedValue({
      id: 'w1',
      user_id: 'u1',
      show_id: 1,
      show_name: 'Show One',
      show_poster_path: null,
      added_at: '2026-01-01T00:00:00Z',
    })
    vi.mocked(addToWatchlist).mockResolvedValue({
      id: 'w2',
      user_id: 'u1',
      show_id: 1,
      show_name: 'Show One',
      show_poster_path: null,
      added_at: '2026-01-02T00:00:00Z',
    })

    const { result } = renderHook(() => useShowDetail(1, user))
    await waitFor(() => expect(result.current.loadingShow).toBe(false))

    await act(async () => {
      await result.current.handleToggleWatchlist()
    })
    expect(result.current.watchlistItem).toBeNull()
    expect(result.current.toast?.action?.label).toBe('Undo')

    await act(async () => {
      result.current.toast?.action?.onClick()
    })
    await waitFor(() => expect(result.current.watchlistItem).not.toBeNull())
  })

  it('handleRateShow upserts a rating and handleRateShow(0) clears it', async () => {
    vi.mocked(upsertShowRating).mockResolvedValue({
      id: 'r1',
      user_id: 'u1',
      show_id: 1,
      show_name: 'Show One',
      show_poster_path: null,
      rating: 4.5,
      rated_at: '2026-01-01T00:00:00Z',
    })
    vi.mocked(deleteShowRating).mockResolvedValue(undefined)

    const { result } = renderHook(() => useShowDetail(1, user))
    await waitFor(() => expect(result.current.loadingShow).toBe(false))

    await act(async () => {
      await result.current.handleRateShow(4.5)
    })
    expect(result.current.myShowRating?.rating).toBe(4.5)

    await act(async () => {
      await result.current.handleRateShow(0)
    })
    expect(deleteShowRating).toHaveBeenCalledWith('u1', 1)
    expect(result.current.myShowRating).toBeNull()
  })

  it('estimates the show rating from the seasons the user has rated so far', async () => {
    vi.mocked(fetchAllSeasonRatingsForShow).mockResolvedValue([
      { id: 'sr1', user_id: 'u1', show_id: 1, show_name: 'Show One', show_poster_path: null, season_number: 1, season_name: 'Season 1', rating: 4, rated_at: '2026-01-01T00:00:00Z', users: null },
      { id: 'sr2', user_id: 'u1', show_id: 1, show_name: 'Show One', show_poster_path: null, season_number: 2, season_name: 'Season 2', rating: 5, rated_at: '2026-01-02T00:00:00Z', users: null },
      { id: 'sr3', user_id: 'other', show_id: 1, show_name: 'Show One', show_poster_path: null, season_number: 1, season_name: 'Season 1', rating: 1, rated_at: '2026-01-01T00:00:00Z', users: null },
    ])

    const { result } = renderHook(() => useShowDetail(1, user))
    await waitFor(() => expect(result.current.loadingShow).toBe(false))

    expect(result.current.estimatedShowRating?.average).toBe(4.5)
    expect(result.current.estimatedShowRating?.seasons).toHaveLength(2)
  })

  it('clears the estimate once the show itself has been explicitly rated', async () => {
    vi.mocked(fetchAllSeasonRatingsForShow).mockResolvedValue([
      { id: 'sr1', user_id: 'u1', show_id: 1, show_name: 'Show One', show_poster_path: null, season_number: 1, season_name: 'Season 1', rating: 4, rated_at: '2026-01-01T00:00:00Z', users: null },
    ])
    vi.mocked(upsertShowRating).mockResolvedValue({
      id: 'r1',
      user_id: 'u1',
      show_id: 1,
      show_name: 'Show One',
      show_poster_path: null,
      rating: 3,
      rated_at: '2026-01-01T00:00:00Z',
    })

    const { result } = renderHook(() => useShowDetail(1, user))
    await waitFor(() => expect(result.current.loadingShow).toBe(false))
    expect(result.current.estimatedShowRating).not.toBeNull()

    await act(async () => {
      await result.current.handleRateShow(3)
    })
    expect(result.current.estimatedShowRating).toBeNull()
  })

  it('handleRateSeason upserts a season rating scoped to the active season', async () => {
    vi.mocked(upsertSeasonRating).mockResolvedValue({
      id: 'sr1',
      user_id: 'u1',
      show_id: 1,
      show_name: 'Show One',
      show_poster_path: null,
      season_number: 1,
      season_name: 'Season 1',
      rating: 3.5,
      rated_at: '2026-01-01T00:00:00Z',
    })

    const { result } = renderHook(() => useShowDetail(1, user))
    await waitFor(() => expect(result.current.loadingShow).toBe(false))

    await act(async () => {
      await result.current.handleRateSeason(3.5)
    })

    expect(result.current.mySeasonRating?.rating).toBe(3.5)
  })

  it('logs and deletes a rewatch, offering an undo that restores it', async () => {
    const saved = {
      id: 'rw1',
      user_id: 'u1',
      show_id: 1,
      show_name: 'Show One',
      show_poster_path: null,
      rewatched_at: '2026-01-01T00:00:00Z',
    }
    vi.mocked(logRewatch).mockResolvedValue(saved)
    vi.mocked(deleteRewatch).mockResolvedValue(undefined)
    vi.mocked(restoreRewatch).mockResolvedValue(saved)

    const { result } = renderHook(() => useShowDetail(1, user))
    await waitFor(() => expect(result.current.loadingShow).toBe(false))

    await act(async () => {
      await result.current.handleLogRewatch('2026-01-01T00:00:00Z')
    })
    expect(result.current.rewatches).toHaveLength(1)

    await act(async () => {
      await result.current.handleDeleteRewatch('rw1')
    })
    expect(result.current.rewatches).toHaveLength(0)
    expect(result.current.toast?.action?.label).toBe('Undo')

    await act(async () => {
      result.current.toast?.action?.onClick()
    })
    await waitFor(() => expect(result.current.rewatches).toHaveLength(1))
  })

  it('drops and resumes a show via handleToggleDropped', async () => {
    vi.mocked(dropShow).mockResolvedValue({
      id: 'dr1',
      user_id: 'u1',
      show_id: 1,
      show_name: 'Show One',
      show_poster_path: null,
      dropped_at: '2026-01-01T00:00:00Z',
    })

    const { result } = renderHook(() => useShowDetail(1, user))
    await waitFor(() => expect(result.current.loadingShow).toBe(false))
    expect(result.current.droppedItem).toBeNull()

    await act(async () => {
      result.current.handleToggleDropped()
    })
    await waitFor(() => expect(result.current.savingDropped).toBe(false))
    expect(result.current.droppedItem).not.toBeNull()

    await act(async () => {
      result.current.handleToggleDropped()
    })
    await waitFor(() => expect(result.current.savingDropped).toBe(false))
    expect(result.current.droppedItem).toBeNull()
  })

  it('removes from Now Watching and offers an undo that re-adds it', async () => {
    vi.mocked(fetchWatchedForShow).mockResolvedValue({ '1-1': watchedRow() })
    vi.mocked(dismissShow).mockResolvedValue({
      id: 'd1',
      user_id: 'u1',
      show_id: 1,
      dismissed_at: '2026-01-01T00:00:00Z',
    })

    const { result } = renderHook(() => useShowDetail(1, user))
    await waitFor(() => expect(result.current.loadingShow).toBe(false))
    expect(result.current.inNowWatching).toBe(true)

    await act(async () => {
      result.current.handleToggleNowWatching()
    })
    await waitFor(() => expect(result.current.savingNowWatching).toBe(false))
    expect(result.current.dismissedItem).not.toBeNull()
    expect(result.current.toast?.action?.label).toBe('Undo')

    await act(async () => {
      await result.current.toast?.action?.onClick()
    })
    await waitFor(() => expect(result.current.dismissedItem).toBeNull())
  })

  it('picks and clears a manual streaming-provider override', async () => {
    vi.mocked(setStreamingOverride).mockResolvedValue({
      id: 'o1',
      show_id: 1,
      provider_id: 9,
      provider_name: 'Manual Pick',
      provider_logo_path: null,
      updated_by: 'u1',
      updated_at: '2026-01-01T00:00:00Z',
    })
    vi.mocked(clearStreamingOverride).mockResolvedValue(undefined)

    const { result } = renderHook(() => useShowDetail(1, user))
    await waitFor(() => expect(result.current.loadingShow).toBe(false))

    await act(async () => {
      await result.current.handlePickProvider({
        provider_id: 9,
        provider_name: 'Manual Pick',
        logo_path: null,
        display_priority: 1,
        display_priorities: {},
      })
    })
    expect(result.current.override?.provider_name).toBe('Manual Pick')
    expect(result.current.pickerOpen).toBe(false)

    await act(async () => {
      await result.current.handleClearOverride()
    })
    expect(result.current.override).toBeNull()
  })
})

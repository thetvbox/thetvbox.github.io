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
import { fetchDismissedItem, undismissShow } from '../lib/showDismissed'
import { fetchDroppedItem, undropShow } from '../lib/showDropped'
import { fetchWatchlistItem, removeFromWatchlist } from '../lib/watchlist'
import { fetchStartedItem, startShow } from '../lib/showStarted'
import { fetchWatchedForShow, markWatched } from '../lib/watched'

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
})

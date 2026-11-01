import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/tmdb', () => ({
  detectRegion: () => 'US',
  discoverShows: vi.fn(),
  getAllTvProviders: vi.fn(),
}))

import { discoverShows, getAllTvProviders } from '../lib/tmdb'
import { useBrowseShows } from './useBrowseShows'
import type { SearchFilters } from '../lib/searchFilters'
import type { TmdbShowSummary } from '../types'

const GENRES = new Map([
  [18, 'Drama'],
  [35, 'Comedy'],
])

function filters(platforms: string[] = [], genres: string[] = []): SearchFilters {
  return { platforms: new Set(platforms), genres: new Set(genres) }
}

function show(id: number, poster: string | null = '/p.jpg'): TmdbShowSummary {
  return { id, name: `Show ${id}`, poster_path: poster, first_air_date: null, vote_average: 0 } as TmdbShowSummary
}

beforeEach(() => {
  vi.mocked(discoverShows).mockReset().mockResolvedValue([show(1), show(2, null)])
  vi.mocked(getAllTvProviders)
    .mockReset()
    .mockResolvedValue([{ provider_id: 8, provider_name: 'Netflix', logo_path: null, display_priority: 1, display_priorities: {} }])
})

describe('useBrowseShows', () => {
  it('looks up the platform ids and returns the popular shows that have posters', async () => {
    const { result } = renderHook(() => useBrowseShows(filters(['Netflix'], ['Comedy']), GENRES, true))
    await waitFor(() => expect(result.current.shows.map((s) => s.id)).toEqual([1]))
    expect(result.current.loading).toBe(false)
    expect(discoverShows).toHaveBeenCalledWith({ providerIds: [8], genreIds: [35], region: 'US' })
  })

  it('browses by genre without looking up platforms', async () => {
    const { result } = renderHook(() => useBrowseShows(filters([], ['Drama']), GENRES, true))
    await waitFor(() => expect(result.current.shows).toHaveLength(1))
    expect(getAllTvProviders).not.toHaveBeenCalled()
    expect(discoverShows).toHaveBeenCalledWith({ providerIds: [], genreIds: [18], region: 'US' })
  })

  it('finds nothing for a platform TMDB does not list in the region, instead of browsing everything', async () => {
    const { result } = renderHook(() => useBrowseShows(filters(['Group Override Service']), GENRES, true))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.shows).toEqual([])
    expect(discoverShows).not.toHaveBeenCalled()
  })

  it('does nothing while disabled or with no filters, and comes back empty on a failure', async () => {
    renderHook(() => useBrowseShows(filters(['Netflix']), GENRES, false))
    renderHook(() => useBrowseShows(filters(), GENRES, true))
    expect(getAllTvProviders).not.toHaveBeenCalled()

    vi.mocked(discoverShows).mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useBrowseShows(filters([], ['Drama']), GENRES, true))
    await waitFor(() => expect(discoverShows).toHaveBeenCalled())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.shows).toEqual([])
  })
})

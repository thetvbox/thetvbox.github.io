import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./tmdb', () => ({ getShowDetail: vi.fn(), getSeasonDetail: vi.fn() }))
vi.mock('./tvmaze', () => ({ getCorrectedAirDates: vi.fn(), tvmazeEpisodeKey: (s: number, e: number) => `${s}-${e}` }))

import { getSeasonDetail, getShowDetail } from './tmdb'
import { getCorrectedAirDates } from './tvmaze'
import { fetchNextEpisode, fetchSeasonBreakdowns } from './seasonProgress'
import type { TmdbSeasonSummary } from '../types'

function season(seasonNumber: number): TmdbSeasonSummary {
  return { id: seasonNumber, season_number: seasonNumber, name: `Season ${seasonNumber}`, episode_count: 10, poster_path: null, air_date: null }
}

beforeEach(() => {
  vi.mocked(getShowDetail).mockReset()
  vi.mocked(getSeasonDetail).mockReset()
  vi.mocked(getCorrectedAirDates).mockReset()
})

describe('fetchSeasonBreakdowns', () => {
  it('fetches and returns season lists per show id', async () => {
    vi.mocked(getShowDetail).mockResolvedValue({ seasons: [season(1), season(2)] } as never)
    const result = await fetchSeasonBreakdowns([9001])
    expect(result.get(9001)).toHaveLength(2)
  })

  it('caches results across calls, avoiding a second fetch for the same show', async () => {
    vi.mocked(getShowDetail).mockResolvedValue({ seasons: [season(1)] } as never)
    await fetchSeasonBreakdowns([9002])
    await fetchSeasonBreakdowns([9002])
    expect(getShowDetail).toHaveBeenCalledTimes(1)
  })

  it('omits a show from the result when its fetch fails', async () => {
    vi.mocked(getShowDetail).mockRejectedValue(new Error('network error'))
    const result = await fetchSeasonBreakdowns([9003])
    expect(result.has(9003)).toBe(false)
  })

  it('dedupes duplicate show ids before fetching', async () => {
    vi.mocked(getShowDetail).mockResolvedValue({ seasons: [season(1)] } as never)
    await fetchSeasonBreakdowns([9004, 9004, 9004])
    expect(getShowDetail).toHaveBeenCalledTimes(1)
  })
})

describe('fetchNextEpisode', () => {
  it('returns null when no future episode exists in the season', async () => {
    vi.mocked(getSeasonDetail).mockResolvedValue({
      id: 1,
      season_number: 1,
      name: 'Season 1',
      episodes: [{ id: 1, episode_number: 1, season_number: 1, name: 'E1', overview: '', still_path: null, air_date: '2020-01-01', runtime: 30 }],
    } as never)
    vi.mocked(getShowDetail).mockResolvedValue({ external_ids: { imdb_id: null } } as never)
    const result = await fetchNextEpisode(9101, 1)
    expect(result).toBeNull()
  })

  it('returns the next future episode using its raw TMDB air date when TVmaze has no correction', async () => {
    const farFuture = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 20).toISOString().slice(0, 10)
    vi.mocked(getSeasonDetail).mockResolvedValue({
      id: 1,
      season_number: 1,
      name: 'Season 1',
      episodes: [{ id: 2, episode_number: 5, season_number: 1, name: 'E5', overview: '', still_path: null, air_date: farFuture, runtime: 30 }],
    } as never)
    vi.mocked(getShowDetail).mockResolvedValue({ external_ids: { imdb_id: 'tt123' } } as never)
    vi.mocked(getCorrectedAirDates).mockResolvedValue(new Map())
    const result = await fetchNextEpisode(9102, 1)
    expect(result).toEqual({ seasonNumber: 1, episodeNumber: 5, airDate: farFuture })
  })

  it('prefers the TVmaze-corrected air date when available', async () => {
    const farFuture = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 20).toISOString().slice(0, 10)
    vi.mocked(getSeasonDetail).mockResolvedValue({
      id: 1,
      season_number: 1,
      name: 'Season 1',
      episodes: [{ id: 2, episode_number: 5, season_number: 1, name: 'E5', overview: '', still_path: null, air_date: farFuture, runtime: 30 }],
    } as never)
    vi.mocked(getShowDetail).mockResolvedValue({ external_ids: { imdb_id: 'tt123' } } as never)
    vi.mocked(getCorrectedAirDates).mockResolvedValue(new Map([['1-5', '2099-12-25']]))
    const result = await fetchNextEpisode(9103, 1)
    expect(result?.airDate).toBe('2099-12-25')
  })

  it('caches by show+season, avoiding a second fetch', async () => {
    vi.mocked(getSeasonDetail).mockResolvedValue({ id: 1, season_number: 1, name: 'S1', episodes: [] } as never)
    vi.mocked(getShowDetail).mockResolvedValue({ external_ids: {} } as never)
    await fetchNextEpisode(9104, 1)
    await fetchNextEpisode(9104, 1)
    expect(getSeasonDetail).toHaveBeenCalledTimes(1)
  })

  it('returns null instead of throwing when the season fetch fails', async () => {
    vi.mocked(getSeasonDetail).mockRejectedValue(new Error('boom'))
    vi.mocked(getShowDetail).mockResolvedValue({ external_ids: {} } as never)
    const result = await fetchNextEpisode(9105, 1)
    expect(result).toBeNull()
  })
})

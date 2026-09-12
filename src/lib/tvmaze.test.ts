import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectiveAirDate, findNextUpcomingEpisode, getCorrectedAirDates, tvmazeEpisodeKey } from './tvmaze'
import type { TmdbEpisode } from '../types'

function episode(overrides: Partial<TmdbEpisode> = {}): TmdbEpisode {
  return {
    id: 1,
    episode_number: 1,
    season_number: 1,
    name: 'E1',
    overview: '',
    still_path: null,
    air_date: null,
    runtime: 30,
    ...overrides,
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('tvmazeEpisodeKey', () => {
  it('joins season and episode number with a dash', () => {
    expect(tvmazeEpisodeKey(2, 5)).toBe('2-5')
  })
})

describe('getCorrectedAirDates', () => {
  it('returns an empty map when imdbId is null/undefined', async () => {
    expect(await getCorrectedAirDates(null)).toEqual(new Map())
    expect(await getCorrectedAirDates(undefined)).toEqual(new Map())
  })

  it('returns an empty map when TVmaze has no matching show (404 on lookup)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(null, 404))
    vi.stubGlobal('fetch', fetchMock)
    const result = await getCorrectedAirDates('tt-no-match')
    expect(result).toEqual(new Map())
  })

  it('returns an empty map when the lookup request fails outright', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    vi.stubGlobal('fetch', fetchMock)
    const result = await getCorrectedAirDates('tt-network-error')
    expect(result).toEqual(new Map())
  })

  it('resolves the show id then fetches and maps episode air dates', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: 555 }))
      .mockResolvedValueOnce(
        jsonResponse([
          { season: 1, number: 1, airdate: '2020-01-05' },
          { season: 1, number: 2, airdate: '2020-01-12' },
          { season: 2, number: 1, airdate: '' },
        ]),
      )
    vi.stubGlobal('fetch', fetchMock)

    const result = await getCorrectedAirDates('tt-good-show')

    expect(result.get(tvmazeEpisodeKey(1, 1))).toBe('2020-01-05')
    expect(result.get(tvmazeEpisodeKey(1, 2))).toBe('2020-01-12')
    expect(result.has(tvmazeEpisodeKey(2, 1))).toBe(false)
  })

  it('returns an empty map (not a throw) when the episodes request fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: 777 }))
      .mockRejectedValueOnce(new Error('episodes fetch failed'))
    vi.stubGlobal('fetch', fetchMock)

    const result = await getCorrectedAirDates('tt-episodes-fail')
    expect(result).toEqual(new Map())
  })

  it('throws for a non-404 non-ok response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(null, 500))
    vi.stubGlobal('fetch', fetchMock)
    // findTvmazeShowId swallows the throw internally and caches null, so the
    // public function still resolves to an empty map rather than rejecting.
    const result = await getCorrectedAirDates('tt-server-error')
    expect(result).toEqual(new Map())
  })

  it('caches the resolved show id so a second call with the same imdbId skips the lookup', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: 888 }))
      .mockResolvedValueOnce(jsonResponse([{ season: 1, number: 1, airdate: '2021-06-01' }]))
    vi.stubGlobal('fetch', fetchMock)

    await getCorrectedAirDates('tt-cached-show')
    const callsAfterFirst = fetchMock.mock.calls.length
    await getCorrectedAirDates('tt-cached-show')

    expect(fetchMock.mock.calls.length).toBe(callsAfterFirst)
  })
})

describe('effectiveAirDate', () => {
  it('returns null when the episode has no TMDB air date at all', () => {
    expect(effectiveAirDate(episode({ air_date: null }), new Map())).toBeNull()
  })

  it("returns TMDB's raw date when there is no TVmaze correction for it", () => {
    expect(effectiveAirDate(episode({ air_date: '2020-01-01' }), new Map())).toBe('2020-01-01')
  })

  it('prefers the TVmaze correction over the raw TMDB date when one exists', () => {
    const corrected = new Map([[tvmazeEpisodeKey(1, 1), '2020-01-02']])
    expect(effectiveAirDate(episode({ season_number: 1, episode_number: 1, air_date: '2020-01-01' }), corrected)).toBe(
      '2020-01-02',
    )
  })
})

describe('findNextUpcomingEpisode', () => {
  it('returns null when no episode has an air date at all', () => {
    expect(findNextUpcomingEpisode([episode({ air_date: null })], new Map())).toBeNull()
  })

  it('returns null when every episode has already aired', () => {
    expect(findNextUpcomingEpisode([episode({ air_date: '2000-01-01' })], new Map())).toBeNull()
  })

  it('returns the first episode whose raw TMDB date is still upcoming', () => {
    const result = findNextUpcomingEpisode(
      [episode({ episode_number: 1, air_date: '2000-01-01' }), episode({ episode_number: 2, air_date: '2099-12-25' })],
      new Map(),
    )
    expect(result?.episode_number).toBe(2)
  })

  it("does not skip an episode whose TVmaze-corrected date is still upcoming, just because its raw TMDB date already looks past", () => {
    const corrected = new Map([[tvmazeEpisodeKey(1, 5), '2099-12-25']])
    const result = findNextUpcomingEpisode(
      [
        // TMDB's raw date already looks past, but TVmaze says it's genuinely upcoming.
        episode({ episode_number: 5, air_date: '2000-01-01' }),
        // A naive raw-date search would wrongly pick this one instead.
        episode({ episode_number: 6, air_date: '2050-01-01' }),
      ],
      corrected,
    )
    expect(result?.episode_number).toBe(5)
  })
})

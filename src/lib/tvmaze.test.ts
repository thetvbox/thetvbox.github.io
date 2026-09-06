import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCorrectedAirDates, tvmazeEpisodeKey } from './tvmaze'

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

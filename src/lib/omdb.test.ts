import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response
}

describe('omdb (VITE_OMDB_API_KEY configured)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_OMDB_API_KEY', 'test-key')
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('reports itself as configured', async () => {
    const { isOmdbConfigured } = await import('./omdb')
    expect(isOmdbConfigured).toBe(true)
  })

  it('returns null without calling fetch when there is no IMDb id', async () => {
    const { getExternalRatings } = await import('./omdb')
    expect(await getExternalRatings(null)).toBeNull()
    expect(await getExternalRatings(undefined)).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('parses IMDb rating and Rotten Tomatoes score from a successful lookup', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        Response: 'True',
        imdbRating: '8.4',
        Ratings: [
          { Source: 'Internet Movie Database', Value: '8.4/10' },
          { Source: 'Rotten Tomatoes', Value: '92%' },
          { Source: 'Metacritic', Value: '80/100' },
        ],
      }),
    )
    const { getExternalRatings } = await import('./omdb')

    const result = await getExternalRatings('tt1234567')

    expect(result).toEqual({ imdbRating: 8.4, rottenTomatoesScore: 92 })
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('apikey=test-key')
    expect(url).toContain('i=tt1234567')
  })

  it('returns just the IMDb rating when OMDb has no Rotten Tomatoes entry for it', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ Response: 'True', imdbRating: '7.1', Ratings: [] }))
    const { getExternalRatings } = await import('./omdb')

    expect(await getExternalRatings('tt-no-rt')).toEqual({ imdbRating: 7.1, rottenTomatoesScore: null })
  })

  it('treats an unrated ("N/A") IMDb rating as null', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        Response: 'True',
        imdbRating: 'N/A',
        Ratings: [{ Source: 'Rotten Tomatoes', Value: '55%' }],
      }),
    )
    const { getExternalRatings } = await import('./omdb')

    expect(await getExternalRatings('tt-unrated-imdb')).toEqual({ imdbRating: null, rottenTomatoesScore: 55 })
  })

  it('returns null when OMDb has no record for this IMDb id', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ Response: 'False', Error: 'Incorrect IMDb ID.' }))
    const { getExternalRatings } = await import('./omdb')

    expect(await getExternalRatings('tt-not-found')).toBeNull()
  })

  it('returns null (not a throw) when the request fails outright', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'))
    const { getExternalRatings } = await import('./omdb')

    expect(await getExternalRatings('tt-network-error')).toBeNull()
  })

  it('returns null when the response is a non-ok HTTP status', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(null, false, 500))
    const { getExternalRatings } = await import('./omdb')

    expect(await getExternalRatings('tt-server-error')).toBeNull()
  })

  it('caches the result so a second call with the same IMDb id skips the fetch', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ Response: 'True', imdbRating: '9.0', Ratings: [] }))
    const { getExternalRatings } = await import('./omdb')

    await getExternalRatings('tt-cached')
    const callsAfterFirst = vi.mocked(fetch).mock.calls.length
    await getExternalRatings('tt-cached')

    expect(vi.mocked(fetch).mock.calls.length).toBe(callsAfterFirst)
  })
})

describe('omdb (VITE_OMDB_API_KEY not configured)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_OMDB_API_KEY', '')
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('reports itself as not configured', async () => {
    const { isOmdbConfigured } = await import('./omdb')
    expect(isOmdbConfigured).toBe(false)
  })

  it('returns null without calling fetch, even with a valid IMDb id', async () => {
    const { getExternalRatings } = await import('./omdb')
    expect(await getExternalRatings('tt1234567')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
})

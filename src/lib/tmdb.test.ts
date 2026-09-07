import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response
}

describe('tmdb (VITE_TMDB_API_KEY configured)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_TMDB_API_KEY', 'test-key')
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('reports itself as configured', async () => {
    const { isTmdbConfigured } = await import('./tmdb')
    expect(isTmdbConfigured).toBe(true)
  })

  it('searchShows returns an empty array for a blank query without calling fetch', async () => {
    const { searchShows } = await import('./tmdb')
    expect(await searchShows('   ')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('searchShows returns the results array from the API', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ results: [{ id: 1, name: 'Show One' }] }))
    const { searchShows } = await import('./tmdb')
    expect(await searchShows('star trek')).toEqual([{ id: 1, name: 'Show One' }])
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('/search/tv')
    expect(url).toContain('api_key=test-key')
    expect(url).toContain('query=star+trek')
  })

  it('throws a TmdbError when the API responds with a non-ok status', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, false, 500))
    const { searchShows } = await import('./tmdb')
    await expect(searchShows('star trek')).rejects.toThrow('TMDB request failed (500)')
  })

  it('getShowDetail fetches and caches the show detail', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ id: 1, name: 'Show One' }))
    const { getShowDetail } = await import('./tmdb')
    const first = await getShowDetail(1)
    const second = await getShowDetail(1)
    expect(first).toEqual({ id: 1, name: 'Show One' })
    expect(second).toBe(first)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('getShowDetailsBulk resolves each id independently, dropping failures', async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/tv/2')) return jsonResponse({}, false, 404)
      return jsonResponse({ id: 1, name: 'Show One' })
    })
    const { getShowDetailsBulk } = await import('./tmdb')
    const map = await getShowDetailsBulk([1, 2, 1])
    expect(map.get(1)).toEqual({ id: 1, name: 'Show One' })
    expect(map.has(2)).toBe(false)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('getSeasonDetail fetches the season path', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ id: 1, season_number: 1, episodes: [] }))
    const { getSeasonDetail } = await import('./tmdb')
    await getSeasonDetail(5, 2)
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('/tv/5/season/2')
  })

  it('getWatchProviders fetches the watch/providers path', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ results: {} }))
    const { getWatchProviders } = await import('./tmdb')
    await getWatchProviders(5)
    const url = vi.mocked(fetch).mock.calls[0][0] as string
    expect(url).toContain('/tv/5/watch/providers')
  })

  it('getAllTvProviders sorts by the region-specific display priority', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        results: [
          { provider_id: 1, provider_name: 'B', logo_path: null, display_priority: 2, display_priorities: { US: 2 } },
          { provider_id: 2, provider_name: 'A', logo_path: null, display_priority: 1, display_priorities: { US: 1 } },
        ],
      }),
    )
    const { getAllTvProviders } = await import('./tmdb')
    const providers = await getAllTvProviders('US')
    expect(providers.map((p) => p.provider_name)).toEqual(['A', 'B'])
  })

  it('getAllTvProviders falls back to the default priority when a region entry is missing', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        results: [
          { provider_id: 1, provider_name: 'B', logo_path: null, display_priority: 5, display_priorities: {} },
          { provider_id: 2, provider_name: 'A', logo_path: null, display_priority: 1, display_priorities: {} },
        ],
      }),
    )
    const { getAllTvProviders } = await import('./tmdb')
    const providers = await getAllTvProviders('FR')
    expect(providers.map((p) => p.provider_name)).toEqual(['A', 'B'])
  })
})

describe('tmdb (VITE_TMDB_API_KEY not configured)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_TMDB_API_KEY', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('reports itself as not configured', async () => {
    const { isTmdbConfigured } = await import('./tmdb')
    expect(isTmdbConfigured).toBe(false)
  })

  it('rejects any request with a helpful error', async () => {
    const { getShowDetail } = await import('./tmdb')
    await expect(getShowDetail(1)).rejects.toThrow('TMDB is not configured')
  })
})

describe('detectRegion', () => {
  const originalLanguage = Object.getOwnPropertyDescriptor(window.navigator, 'language')

  afterEach(() => {
    if (originalLanguage) Object.defineProperty(window.navigator, 'language', originalLanguage)
  })

  it('extracts a 2-letter region from the browser locale', async () => {
    Object.defineProperty(window.navigator, 'language', { value: 'en-GB', configurable: true })
    const { detectRegion } = await import('./tmdb')
    expect(detectRegion()).toBe('GB')
  })

  it('falls back to US when the locale has no region', async () => {
    Object.defineProperty(window.navigator, 'language', { value: 'en', configurable: true })
    const { detectRegion } = await import('./tmdb')
    expect(detectRegion()).toBe('US')
  })
})

describe('image URL helpers', () => {
  it('returns null for a null path', async () => {
    const { posterUrl, backdropUrl, stillUrl, providerLogoUrl } = await import('./tmdb')
    expect(posterUrl(null)).toBeNull()
    expect(backdropUrl(null)).toBeNull()
    expect(stillUrl(null)).toBeNull()
    expect(providerLogoUrl(null)).toBeNull()
  })

  it('builds a full image URL with the default size', async () => {
    const { posterUrl, backdropUrl, stillUrl, providerLogoUrl } = await import('./tmdb')
    expect(posterUrl('/p.jpg')).toBe('https://image.tmdb.org/t/p/w342/p.jpg')
    expect(backdropUrl('/b.jpg')).toBe('https://image.tmdb.org/t/p/w1280/b.jpg')
    expect(stillUrl('/s.jpg')).toBe('https://image.tmdb.org/t/p/w300/s.jpg')
    expect(providerLogoUrl('/l.jpg')).toBe('https://image.tmdb.org/t/p/w92/l.jpg')
  })

  it('accepts a custom size', async () => {
    const { posterUrl } = await import('./tmdb')
    expect(posterUrl('/p.jpg', 'original')).toBe('https://image.tmdb.org/t/p/original/p.jpg')
  })
})

describe('yearFromDate', () => {
  it('returns an empty string for a null date', async () => {
    const { yearFromDate } = await import('./tmdb')
    expect(yearFromDate(null)).toBe('')
  })

  it('returns the 4-digit year prefix', async () => {
    const { yearFromDate } = await import('./tmdb')
    expect(yearFromDate('2020-05-01')).toBe('2020')
  })
})

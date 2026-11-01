import type {
  TmdbGenre,
  TmdbProviderListItem,
  TmdbSeasonDetail,
  TmdbShowDetail,
  TmdbShowSummary,
  TmdbWatchProviders,
} from '../types'
import { ExpiringCache, getOrLoad } from './expiringCache'

const API_BASE = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p'
const API_KEY = import.meta.env.VITE_TMDB_API_KEY

export const isTmdbConfigured = Boolean(API_KEY)

/** How long show, season, trending, and streaming data is reused before TMDB is asked again, so new seasons show up without a reload. */
const TMDB_CACHE_TTL_MS = 60 * 60 * 1000

const DISCOVER_PAGE_COUNT = 2

class TmdbError extends Error {}

/** Fetches a TMDB API path with the API key and default query params applied. */
async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  if (!API_KEY) {
    throw new TmdbError(
      'TMDB is not configured. Set VITE_TMDB_API_KEY in .env.local (see .env.example).',
    )
  }
  const url = new URL(`${API_BASE}${path}`)
  url.searchParams.set('api_key', API_KEY)
  url.searchParams.set('language', 'en-US')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new TmdbError(`TMDB request failed (${res.status}) for ${path}`)
  }
  return res.json() as Promise<T>
}

/** Searches TMDB for TV shows matching a query, ranked by TMDB's own relevance. */
export async function searchShows(query: string): Promise<TmdbShowSummary[]> {
  if (!query.trim()) return []
  const data = await tmdbFetch<{ results: TmdbShowSummary[] }>('/search/tv', {
    query,
    include_adult: 'false',
    page: '1',
  })
  return data.results
}

const trendingCache = new ExpiringCache<'week', Promise<TmdbShowSummary[]>>(TMDB_CACHE_TTL_MS)

/** Fetches this week's trending TV shows, cached for an hour since the list barely moves. */
export function getTrendingShows(): Promise<TmdbShowSummary[]> {
  return getOrLoad(trendingCache, 'week', async () => {
    const data = await tmdbFetch<{ results: TmdbShowSummary[] }>('/trending/tv/week')
    return data.results
  })
}

let tvGenresCache: TmdbGenre[] | null = null

/** Fetches TMDB's full TV genre id/name list, session-cached since it never changes within a session. */
export async function getTvGenres(): Promise<TmdbGenre[]> {
  if (tvGenresCache) return tvGenresCache
  const data = await tmdbFetch<{ genres: TmdbGenre[] }>('/genre/tv/list')
  tvGenresCache = data.genres
  return tvGenresCache
}

const showDetailCache = new ExpiringCache<number, Promise<TmdbShowDetail>>(TMDB_CACHE_TTL_MS)

/** Fetches a show's full detail, cached for an hour, including external_ids for TVmaze cross-referencing. */
export function getShowDetail(showId: number): Promise<TmdbShowDetail> {
  return getOrLoad(showDetailCache, showId, () =>
    tmdbFetch<TmdbShowDetail>(`/tv/${showId}`, { append_to_response: 'external_ids' }),
  )
}

const seasonDetailCache = new ExpiringCache<string, Promise<TmdbSeasonDetail>>(TMDB_CACHE_TTL_MS)

/** Fetches a season's full episode list, cached for an hour like getShowDetail. */
export function getSeasonDetail(showId: number, seasonNumber: number): Promise<TmdbSeasonDetail> {
  return getOrLoad(seasonDetailCache, `${showId}:${seasonNumber}`, () =>
    tmdbFetch<TmdbSeasonDetail>(`/tv/${showId}/season/${seasonNumber}`),
  )
}

const watchProvidersCache = new ExpiringCache<number, Promise<TmdbWatchProviders>>(TMDB_CACHE_TTL_MS)

/** Fetches streaming/rent/buy availability by country, sourced from JustWatch via TMDB, cached for an hour. */
export function getWatchProviders(showId: number): Promise<TmdbWatchProviders> {
  return getOrLoad(watchProvidersCache, showId, () => tmdbFetch<TmdbWatchProviders>(`/tv/${showId}/watch/providers`))
}

const tvProvidersCache = new ExpiringCache<string, Promise<TmdbProviderListItem[]>>(TMDB_CACHE_TTL_MS)

/** Fetches every streaming provider TMDB knows about for a region, cached for an hour. */
export function getAllTvProviders(region: string): Promise<TmdbProviderListItem[]> {
  return getOrLoad(tvProvidersCache, region, async () => {
    const data = await tmdbFetch<{ results: TmdbProviderListItem[] }>('/watch/providers/tv', {
      watch_region: region,
    })
    return (data.results ?? []).slice().sort((a, b) => {
      const ap = a.display_priorities[region] ?? a.display_priority
      const bp = b.display_priorities[region] ?? b.display_priority
      return ap - bp
    })
  })
}

const discoverCache = new ExpiringCache<string, Promise<TmdbShowSummary[]>>(TMDB_CACHE_TTL_MS)

/** The most popular shows streaming free-to-you on any of `providerIds` in `region` and in any of `genreIds`, cached for an hour. */
export function discoverShows(options: { providerIds: number[]; genreIds: number[]; region: string }): Promise<TmdbShowSummary[]> {
  const providers = [...options.providerIds].sort((a, b) => a - b).join('|')
  const genres = [...options.genreIds].sort((a, b) => a - b).join('|')
  const params: Record<string, string> = { sort_by: 'popularity.desc', include_adult: 'false' }
  if (providers) {
    params.with_watch_providers = providers
    params.watch_region = options.region
    params.with_watch_monetization_types = 'flatrate|free|ads'
  }
  if (genres) params.with_genres = genres
  return getOrLoad(discoverCache, `${options.region}:${providers}:${genres}`, async () => {
    const pages = await Promise.all(
      Array.from({ length: DISCOVER_PAGE_COUNT }, (_, i) =>
        tmdbFetch<{ results: TmdbShowSummary[] }>('/discover/tv', { ...params, page: String(i + 1) }),
      ),
    )
    const seen = new Set<number>()
    return pages
      .flatMap((page) => page.results)
      .filter((show) => {
        if (seen.has(show.id)) return false
        seen.add(show.id)
        return true
      })
  })
}

/** Returns a best-guess 2-letter region from the browser's own locale, falling back to US. */
export function detectRegion(): string {
  try {
    const locale = navigator.language || 'en-US'
    const region = locale.split('-')[1]?.toUpperCase()
    return region && region.length === 2 ? region : 'US'
  } catch {
    return 'US'
  }
}

type ImageSize =
  | 'w92'
  | 'w154'
  | 'w185'
  | 'w300'
  | 'w342'
  | 'w500'
  | 'w780'
  | 'w1280'
  | 'original'

const IMAGE_SIZE_WIDTHS: Partial<Record<ImageSize, number>> = {
  w92: 92,
  w154: 154,
  w185: 185,
  w300: 300,
  w342: 342,
  w500: 500,
  w780: 780,
  w1280: 1280,
}

export function posterUrl(path: string | null, size: ImageSize = 'w342'): string | null {
  if (!path) return null
  return `${IMAGE_BASE}/${size}${path}`
}

/** Builds an `<img srcset>` string offering several TMDB image widths, so the browser picks the right one for the viewport and device pixel ratio. */
export function buildSrcSet(path: string | null, sizes: ImageSize[]): string | undefined {
  if (!path) return undefined
  const entries = sizes
    .map((size) => {
      const width = IMAGE_SIZE_WIDTHS[size]
      return width ? `${IMAGE_BASE}/${size}${path} ${width}w` : null
    })
    .filter((entry): entry is string => entry !== null)
  return entries.length > 0 ? entries.join(', ') : undefined
}

export function backdropUrl(path: string | null, size: ImageSize = 'w1280'): string | null {
  if (!path) return null
  return `${IMAGE_BASE}/${size}${path}`
}

export function stillUrl(path: string | null, size: ImageSize = 'w300'): string | null {
  if (!path) return null
  return `${IMAGE_BASE}/${size}${path}`
}

export function providerLogoUrl(path: string | null, size: ImageSize = 'w92'): string | null {
  if (!path) return null
  return `${IMAGE_BASE}/${size}${path}`
}

export function yearFromDate(date: string | null): string {
  if (!date) return ''
  const year = date.slice(0, 4)
  return year || ''
}

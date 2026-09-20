import type {
  TmdbGenre,
  TmdbProviderListItem,
  TmdbSeasonDetail,
  TmdbShowDetail,
  TmdbShowSummary,
  TmdbWatchProviders,
} from '../types'

const API_BASE = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p'
const API_KEY = import.meta.env.VITE_TMDB_API_KEY

export const isTmdbConfigured = Boolean(API_KEY)

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

let trendingCache: TmdbShowSummary[] | null = null

/** Fetches this week's trending TV shows, session-cached since the list barely moves within a session. */
export async function getTrendingShows(): Promise<TmdbShowSummary[]> {
  if (trendingCache) return trendingCache
  const data = await tmdbFetch<{ results: TmdbShowSummary[] }>('/trending/tv/week')
  trendingCache = data.results
  return trendingCache
}

let tvGenresCache: TmdbGenre[] | null = null

/** Fetches TMDB's full TV genre id/name list, session-cached since it never changes within a session. */
export async function getTvGenres(): Promise<TmdbGenre[]> {
  if (tvGenresCache) return tvGenresCache
  const data = await tmdbFetch<{ genres: TmdbGenre[] }>('/genre/tv/list')
  tvGenresCache = data.genres
  return tvGenresCache
}

const showDetailCache = new Map<number, TmdbShowDetail>()

/** Fetches a show's full detail, session-cached, including external_ids for TVmaze cross-referencing. */
export async function getShowDetail(showId: number): Promise<TmdbShowDetail> {
  const cached = showDetailCache.get(showId)
  if (cached) return cached
  const detail = await tmdbFetch<TmdbShowDetail>(`/tv/${showId}`, { append_to_response: 'external_ids' })
  showDetailCache.set(showId, detail)
  return detail
}

/** Batched, cached getShowDetail for History filters; a failed fetch is just missing from the map. */
export async function getShowDetailsBulk(showIds: number[]): Promise<Map<number, TmdbShowDetail>> {
  const uniqueIds = [...new Set(showIds)]
  const results = await Promise.all(
    uniqueIds.map(async (id): Promise<[number, TmdbShowDetail | null]> => {
      try {
        return [id, await getShowDetail(id)]
      } catch {
        return [id, null]
      }
    }),
  )
  const map = new Map<number, TmdbShowDetail>()
  for (const [id, detail] of results) {
    if (detail) map.set(id, detail)
  }
  return map
}

const seasonDetailCache = new Map<string, TmdbSeasonDetail>()

/** Fetches a season's full episode list, session-cached like getShowDetail. */
export async function getSeasonDetail(showId: number, seasonNumber: number): Promise<TmdbSeasonDetail> {
  const key = `${showId}:${seasonNumber}`
  const cached = seasonDetailCache.get(key)
  if (cached) return cached
  const detail = await tmdbFetch<TmdbSeasonDetail>(`/tv/${showId}/season/${seasonNumber}`)
  seasonDetailCache.set(key, detail)
  return detail
}

const watchProvidersCache = new Map<number, TmdbWatchProviders>()

/** Fetches streaming/rent/buy availability by country, sourced from JustWatch via TMDB, session-cached. */
export async function getWatchProviders(showId: number): Promise<TmdbWatchProviders> {
  const cached = watchProvidersCache.get(showId)
  if (cached) return cached
  const data = await tmdbFetch<TmdbWatchProviders>(`/tv/${showId}/watch/providers`)
  watchProvidersCache.set(showId, data)
  return data
}

/** Fetches every streaming provider TMDB knows about for a region. */
export async function getAllTvProviders(region: string): Promise<TmdbProviderListItem[]> {
  const data = await tmdbFetch<{ results: TmdbProviderListItem[] }>('/watch/providers/tv', {
    watch_region: region,
  })
  return (data.results ?? []).slice().sort((a, b) => {
    const ap = a.display_priorities[region] ?? a.display_priority
    const bp = b.display_priorities[region] ?? b.display_priority
    return ap - bp
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

export type ImageSize =
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

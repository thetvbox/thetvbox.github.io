/** TMDB's air_date sometimes reflects an early-access drop rather than the
 * marketed release day (e.g. Apple TV+ episodes posted the evening before).
 * TVmaze tracks the TV-guide release day, so it's used as a correction layer
 * over just the *displayed* date -- TMDB stays the backbone for everything
 * else. Matched by IMDb ID (more reliable than title matching); every lookup
 * fails silently to TMDB's own date, since TVmaze's smaller catalog missing
 * a show is expected, not an error. */

const TVMAZE_BASE = 'https://api.tvmaze.com'

async function tvmazeFetch<T>(path: string): Promise<T | null> {
  const res = await fetch(`${TVMAZE_BASE}${path}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`TVmaze request failed (${res.status}) for ${path}`)
  return res.json() as Promise<T>
}

interface TvmazeShow {
  id: number
}

interface TvmazeEpisode {
  season: number
  number: number
  /** Empty string (not null) when TVmaze doesn't have a date for this episode yet. */
  airdate: string
}

export function tvmazeEpisodeKey(seasonNumber: number, episodeNumber: number): string {
  return `${seasonNumber}-${episodeNumber}`
}

// Session-lifetime caches, keyed by IMDb ID -- what both lookups need.
const showIdByImdbId = new Map<string, number | null>()
const airDatesByTvmazeShowId = new Map<number, Map<string, string>>()

async function findTvmazeShowId(imdbId: string): Promise<number | null> {
  const cached = showIdByImdbId.get(imdbId)
  if (cached !== undefined) return cached
  let result: number | null = null
  try {
    const show = await tvmazeFetch<TvmazeShow>(`/lookup/shows?imdb=${encodeURIComponent(imdbId)}`)
    result = show?.id ?? null
  } catch {
    result = null
  }
  showIdByImdbId.set(imdbId, result)
  return result
}

async function fetchTvmazeAirDates(tvmazeShowId: number): Promise<Map<string, string>> {
  const cached = airDatesByTvmazeShowId.get(tvmazeShowId)
  if (cached) return cached
  const map = new Map<string, string>()
  try {
    const episodes = await tvmazeFetch<TvmazeEpisode[]>(`/shows/${tvmazeShowId}/episodes`)
    for (const ep of episodes ?? []) {
      if (ep.airdate) map.set(tvmazeEpisodeKey(ep.season, ep.number), ep.airdate)
    }
  } catch {
    // Leave the map empty -- callers fall back to TMDB's own air_date per episode.
  }
  airDatesByTvmazeShowId.set(tvmazeShowId, map)
  return map
}

/** Corrected air dates for one show, keyed by tvmazeEpisodeKey. Empty map
 * (not an error) on no IMDb ID, no match, or a failed lookup -- callers do
 * `corrected.get(key) ?? episode.air_date`. */
export async function getCorrectedAirDates(imdbId: string | null | undefined): Promise<Map<string, string>> {
  if (!imdbId) return new Map()
  const tvmazeShowId = await findTvmazeShowId(imdbId)
  if (tvmazeShowId === null) return new Map()
  return fetchTvmazeAirDates(tvmazeShowId)
}

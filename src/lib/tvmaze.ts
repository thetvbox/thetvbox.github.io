import { isFutureDate } from './date'
import type { TmdbEpisode } from '../types'

const TVMAZE_BASE = 'https://api.tvmaze.com'

/** Fetches a TVmaze API path, returning null on a 404. */
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
  number: number | null
  airdate: string
}

export function tvmazeEpisodeKey(seasonNumber: number, episodeNumber: number): string {
  return `${seasonNumber}-${episodeNumber}`
}

const showIdByImdbId = new Map<string, number | null>()
const episodesByTvmazeShowId = new Map<number, Promise<TvmazeEpisode[] | null>>()

/** Resolves a show's TVmaze id from its IMDb id, session-cached. */
async function findTvmazeShowId(imdbId: string): Promise<number | null> {
  const cached = showIdByImdbId.get(imdbId)
  if (cached !== undefined) return cached
  let result: number | null
  try {
    const show = await tvmazeFetch<TvmazeShow>(`/lookup/shows?imdb=${encodeURIComponent(imdbId)}`)
    result = show?.id ?? null
  } catch {
    return null
  }
  showIdByImdbId.set(imdbId, result)
  return result
}

/** Fetches a show's regular (non-special) episodes from TVmaze once per session; null when the lookup fails. */
function fetchTvmazeEpisodes(tvmazeShowId: number): Promise<TvmazeEpisode[] | null> {
  let episodes = episodesByTvmazeShowId.get(tvmazeShowId)
  if (!episodes) {
    episodes = tvmazeFetch<TvmazeEpisode[]>(`/shows/${tvmazeShowId}/episodes`).catch(() => {
      episodesByTvmazeShowId.delete(tvmazeShowId)
      return null
    })
    episodesByTvmazeShowId.set(tvmazeShowId, episodes)
  }
  return episodes
}

/** All of a show's episode air dates from TVmaze, keyed by tvmazeEpisodeKey. */
async function fetchTvmazeAirDates(tvmazeShowId: number): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  for (const ep of (await fetchTvmazeEpisodes(tvmazeShowId)) ?? []) {
    if (ep.airdate && ep.number !== null) map.set(tvmazeEpisodeKey(ep.season, ep.number), ep.airdate)
  }
  return map
}

/** How many episodes each of a show's seasons has on TVmaze, which numbers seasons the way streamers do; null when unknown. */
export async function getTvmazeSeasonSizes(imdbId: string | null | undefined): Promise<number[] | null> {
  if (!imdbId) return null
  const tvmazeShowId = await findTvmazeShowId(imdbId)
  if (tvmazeShowId === null) return null
  const episodes = await fetchTvmazeEpisodes(tvmazeShowId)
  if (!episodes || episodes.length === 0) return null
  const counts = new Map<number, number>()
  for (const ep of episodes) {
    if (ep.season > 0 && ep.number !== null) counts.set(ep.season, (counts.get(ep.season) ?? 0) + 1)
  }
  return [...counts.entries()].sort(([a], [b]) => a - b).map(([, count]) => count)
}

/** Fetches TVmaze's corrected air dates for one show, keyed by tvmazeEpisodeKey. */
export async function getCorrectedAirDates(imdbId: string | null | undefined): Promise<Map<string, string>> {
  if (!imdbId) return new Map()
  const tvmazeShowId = await findTvmazeShowId(imdbId)
  if (tvmazeShowId === null) return new Map()
  return fetchTvmazeAirDates(tvmazeShowId)
}

/** An episode's effective air date: TVmaze's correction if there is one, else TMDB's own. */
export function effectiveAirDate(
  ep: { season_number: number; episode_number: number; air_date: string | null },
  correctedAirDates: Map<string, string>,
): string | null {
  if (!ep.air_date) return null
  return correctedAirDates.get(tvmazeEpisodeKey(ep.season_number, ep.episode_number)) ?? ep.air_date
}

/** Finds the next not-yet-aired episode in a list, deciding by each episode's corrected air date. */
export function findNextUpcomingEpisode(
  episodes: TmdbEpisode[],
  correctedAirDates: Map<string, string>,
): TmdbEpisode | null {
  for (const ep of episodes) {
    const date = effectiveAirDate(ep, correctedAirDates)
    if (date && isFutureDate(date)) return ep
  }
  return null
}

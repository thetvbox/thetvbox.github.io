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
  number: number
  airdate: string
}

export function tvmazeEpisodeKey(seasonNumber: number, episodeNumber: number): string {
  return `${seasonNumber}-${episodeNumber}`
}

const showIdByImdbId = new Map<string, number | null>()
const airDatesByTvmazeShowId = new Map<number, Map<string, string>>()

/** Resolves a show's TVmaze id from its IMDb id, session-cached. */
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

/** Fetches all of a show's episode air dates from TVmaze, session-cached. */
async function fetchTvmazeAirDates(tvmazeShowId: number): Promise<Map<string, string>> {
  const cached = airDatesByTvmazeShowId.get(tvmazeShowId)
  if (cached) return cached
  const map = new Map<string, string>()
  try {
    const episodes = await tvmazeFetch<TvmazeEpisode[]>(`/shows/${tvmazeShowId}/episodes`)
    for (const ep of episodes ?? []) {
      if (ep.airdate) map.set(tvmazeEpisodeKey(ep.season, ep.number), ep.airdate)
    }
  } catch {}
  airDatesByTvmazeShowId.set(tvmazeShowId, map)
  return map
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

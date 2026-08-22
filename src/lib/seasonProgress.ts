import { getSeasonDetail, getShowDetail } from './tmdb'
import { getCorrectedAirDates, tvmazeEpisodeKey } from './tvmaze'
import { isFutureDate } from './date'
import type { TmdbSeasonSummary } from '../types'

/** One season's watched/total, in order. */
export interface SeasonSegment {
  seasonNumber: number
  watched: number
  total: number
}

export interface SeasonProgress {
  segments: SeasonSegment[]
  currentSeasonNumber: number
  currentSeasonWatched: number
  currentSeasonTotal: number
}

/** Turns "10/44 watched" into which season is in progress. "Current" is the
 * first not-fully-watched real season, falling back to the last one if all
 * are somehow complete (stale TMDB episode counts). */
export function computeSeasonProgress(
  seasons: TmdbSeasonSummary[],
  watchedBySeason: Record<number, number>,
): SeasonProgress | null {
  const real = seasons
    .filter((s) => s.season_number > 0 && s.episode_count > 0)
    .sort((a, b) => a.season_number - b.season_number)
  if (real.length === 0) return null

  const segments: SeasonSegment[] = real.map((s) => ({
    seasonNumber: s.season_number,
    watched: Math.min(watchedBySeason[s.season_number] ?? 0, s.episode_count),
    total: s.episode_count,
  }))

  const current = segments.find((s) => s.watched < s.total) ?? segments[segments.length - 1]

  return {
    segments,
    currentSeasonNumber: current.seasonNumber,
    currentSeasonWatched: current.watched,
    currentSeasonTotal: current.total,
  }
}

// Module-level cache: a show's season breakdown is stable within a session.
const seasonCache = new Map<number, TmdbSeasonSummary[]>()

/** Batched + cached per-show season breakdowns, for computing season progress
 * across everything in "Now Watching" at once. */
export async function fetchSeasonBreakdowns(showIds: number[]): Promise<Map<number, TmdbSeasonSummary[]>> {
  const uncached = [...new Set(showIds)].filter((id) => !seasonCache.has(id))

  await Promise.all(
    uncached.map(async (id) => {
      try {
        const detail = await getShowDetail(id)
        seasonCache.set(id, detail.seasons)
      } catch {
        // Nice-to-have -- callers fall back to the flat total if missing.
      }
    }),
  )

  const result = new Map<number, TmdbSeasonSummary[]>()
  for (const id of showIds) {
    const seasons = seasonCache.get(id)
    if (seasons) result.set(id, seasons)
  }
  return result
}

export interface NextEpisode {
  seasonNumber: number
  episodeNumber: number
  airDate: string
}

// Separate cache from seasonCache: "next unaired episode" changes as real
// time passes, unlike the static season/episode-count breakdown above.
const nextEpisodeCache = new Map<string, NextEpisode | null>()

function nextEpisodeCacheKey(showId: number, seasonNumber: number): string {
  return `${showId}:${seasonNumber}`
}

/** The next not-yet-aired episode in a show's season, if any -- powers the
 * "new episode soon" badge on Now Watching and ShowDetail. Cached per session. */
export async function fetchNextEpisode(showId: number, seasonNumber: number): Promise<NextEpisode | null> {
  const key = nextEpisodeCacheKey(showId, seasonNumber)
  if (nextEpisodeCache.has(key)) return nextEpisodeCache.get(key) ?? null

  try {
    const [detail, show] = await Promise.all([
      getSeasonDetail(showId, seasonNumber),
      // Just for the IMDb ID -- getShowDetail is cached, so this is free
      // once fetchSeasonBreakdowns has already loaded this show.
      getShowDetail(showId).catch(() => null),
    ])
    const next = detail.episodes.find((ep) => ep.air_date && isFutureDate(ep.air_date))
    let result: NextEpisode | null = null
    if (next) {
      const corrected = await getCorrectedAirDates(show?.external_ids?.imdb_id).catch(() => new Map<string, string>())
      const airDate = corrected.get(tvmazeEpisodeKey(next.season_number, next.episode_number)) ?? next.air_date!
      result = { seasonNumber, episodeNumber: next.episode_number, airDate }
    }
    nextEpisodeCache.set(key, result)
    return result
  } catch {
    return null
  }
}

import { getSeasonDetail, getShowDetail } from './tmdb'
import { effectiveAirDate, findNextUpcomingEpisode, getCorrectedAirDates } from './tvmaze'
import type { TmdbSeasonSummary } from '../types'

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

/** Tallies watched-episode counts per season from a flat list of watched rows. */
export function countWatchedBySeason(rows: { season_number: number }[]): Record<number, number> {
  const counts: Record<number, number> = {}
  for (const row of rows) counts[row.season_number] = (counts[row.season_number] ?? 0) + 1
  return counts
}

/** Works out which season is "current": the first not-fully-watched real season. */
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

const seasonCache = new Map<number, TmdbSeasonSummary[]>()

/** Fetches batched, session-cached per-show season breakdowns. */
export async function fetchSeasonBreakdowns(showIds: number[]): Promise<Map<number, TmdbSeasonSummary[]>> {
  const uncached = [...new Set(showIds)].filter((id) => !seasonCache.has(id))

  await Promise.all(
    uncached.map(async (id) => {
      try {
        const detail = await getShowDetail(id)
        seasonCache.set(id, detail.seasons)
      } catch {}
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

const nextEpisodeCache = new Map<string, NextEpisode | null>()

function nextEpisodeCacheKey(showId: number, seasonNumber: number): string {
  return `${showId}:${seasonNumber}`
}

/** Fetches the next not-yet-aired episode in a show's season, if any. */
export async function fetchNextEpisode(showId: number, seasonNumber: number): Promise<NextEpisode | null> {
  const key = nextEpisodeCacheKey(showId, seasonNumber)
  if (nextEpisodeCache.has(key)) return nextEpisodeCache.get(key) ?? null

  try {
    const [detail, show] = await Promise.all([
      getSeasonDetail(showId, seasonNumber),
      getShowDetail(showId).catch(() => null),
    ])
    const corrected = await getCorrectedAirDates(show?.external_ids?.imdb_id).catch(() => new Map<string, string>())
    const next = findNextUpcomingEpisode(detail.episodes, corrected)
    const result: NextEpisode | null = next
      ? { seasonNumber, episodeNumber: next.episode_number, airDate: effectiveAirDate(next, corrected)! }
      : null
    nextEpisodeCache.set(key, result)
    return result
  } catch {
    return null
  }
}

// TMDB show and season data in the numbering the app shows and stores: the streamer's, with any
// season splits applied (see seasonSplits.ts). Screens read shows through here, not tmdb.ts.
import { getSeasonDetail as getTmdbSeasonDetail, getShowDetail as getTmdbShowDetail } from './tmdb'
import { fetchSeasonSplits, prefetchSeasonSplits } from './seasonSplitData'
import { splitSeasonDetail, splitShowDetail, tmdbSeasonPart } from './seasonSplits'
import type { TmdbSeasonDetail, TmdbShowDetail } from '../types'

/** A show's detail with its seasons numbered the way the app shows them. */
export async function getShowDetail(showId: number): Promise<TmdbShowDetail> {
  const [show, splits] = await Promise.all([getTmdbShowDetail(showId), fetchSeasonSplits(showId)])
  return splitShowDetail(show, splits)
}

/** Batched getShowDetail for lists; a failed show is just missing from the map. */
export async function getShowDetailsBulk(showIds: number[]): Promise<Map<number, TmdbShowDetail>> {
  const uniqueIds = [...new Set(showIds)]
  await prefetchSeasonSplits(uniqueIds)
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

/** One season's episodes in the app's numbering, cut from TMDB's season when that season is split. */
export async function getSeasonDetail(showId: number, seasonNumber: number): Promise<TmdbSeasonDetail> {
  const splits = await fetchSeasonSplits(showId)
  const part = tmdbSeasonPart(splits, seasonNumber)
  const detail = await getTmdbSeasonDetail(showId, part.tmdbSeason)
  return splitSeasonDetail(detail, splits, seasonNumber)
}

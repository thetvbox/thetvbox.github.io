import { supabase } from './supabase'
import { getShowDetail as getTmdbShowDetail } from './tmdb'
import { getTvmazeSeasonSizes } from './tvmaze'
import { detectSeasonSplits, type SeasonSplit } from './seasonSplits'
import { RPC_RECORD_SEASON_SPLITS, TABLE_SEASON_SPLITS } from './constants'
import { ExpiringCache, getOrLoad } from './expiringCache'

/** Short, so a split another member records reaches an open tab before it files a watch in the old numbering. */
const SEASON_SPLITS_CACHE_TTL_MS = 5 * 60 * 1000
const splitsByShowId = new ExpiringCache<number, Promise<SeasonSplit[]>>(SEASON_SPLITS_CACHE_TTL_MS)

interface SeasonSplitRow {
  show_id: number
  tmdb_season: number
  part_sizes: number[]
}

function toSeasonSplit(row: SeasonSplitRow): SeasonSplit {
  return { tmdbSeason: row.tmdb_season, partSizes: row.part_sizes }
}

/** The recorded season splits for a show, cached for a few minutes; throws rather than guess, since a wrong numbering would misfile watches. */
export function fetchSeasonSplits(showId: number): Promise<SeasonSplit[]> {
  return getOrLoad(splitsByShowId, showId, async () => {
    const { data, error } = await supabase
      .from(TABLE_SEASON_SPLITS)
      .select('show_id, tmdb_season, part_sizes')
      .eq('show_id', showId)
      .order('tmdb_season')
    if (error) throw error
    return ((data ?? []) as SeasonSplitRow[]).map(toSeasonSplit)
  })
}

/** Loads the splits for many shows in one query and caches each, so a list of shows doesn't send one query per show. */
export function prefetchSeasonSplits(showIds: number[]): Promise<void> {
  const missing = [...new Set(showIds)].filter((id) => !splitsByShowId.get(id))
  if (missing.length === 0) return Promise.resolve()
  const rows = (async () => {
    const { data, error } = await supabase
      .from(TABLE_SEASON_SPLITS)
      .select('show_id, tmdb_season, part_sizes')
      .in('show_id', missing)
      .order('tmdb_season')
    if (error) throw error
    return (data ?? []) as SeasonSplitRow[]
  })()
  for (const id of missing) {
    getOrLoad(splitsByShowId, id, async () => (await rows).filter((row) => row.show_id === id).map(toSeasonSplit))
  }
  return rows.then(
    () => undefined,
    () => undefined,
  )
}

/** Checks TVmaze for seasons TMDB lumps together and records any new ones, which renumbers everyone's watches for that show; true when something changed. */
export async function syncSeasonSplits(showId: number): Promise<boolean> {
  const show = await getTmdbShowDetail(showId)
  const sizes = await getTvmazeSeasonSizes(show.external_ids?.imdb_id)
  if (!sizes) return false
  const known = new Set((await fetchSeasonSplits(showId)).map((s) => s.tmdbSeason))
  const found = detectSeasonSplits(show.seasons, sizes).filter((s) => !known.has(s.tmdbSeason))
  if (found.length === 0) return false
  const { error } = await supabase.rpc(RPC_RECORD_SEASON_SPLITS, {
    p_show_id: showId,
    p_splits: found.map((s) => ({ tmdb_season: s.tmdbSeason, part_sizes: s.partSizes })),
  })
  splitsByShowId.delete(showId)
  if (error) throw error
  return true
}

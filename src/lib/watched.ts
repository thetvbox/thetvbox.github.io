import { supabase } from './supabase'
import { fetchPaginated } from './pagination'
import { ACTIVITY_FETCH_LIMIT, GROUP_ACTIVITY_WATCHED_FETCH_LIMIT } from './constants'
import type { EpisodeWatched, EpisodeWatchedWithUser, WatchedMap } from '../types'

export function watchedKey(seasonNumber: number, episodeNumber: number): string {
  return `${seasonNumber}-${episodeNumber}`
}

/** Placeholder timestamp for "watched at some point, don't know when" -- the
 * column is NOT NULL, and epoch sorts before every real date so these fall to
 * the back of any "most recent" sort. Always paired with watched_at_unknown,
 * which is what the UI checks before rendering a date. */
export const UNKNOWN_WATCHED_AT = new Date(0).toISOString()

/** One user's watched episodes for a show (every season), ordered for the
 * per-show watch-history view. Bulk actions stamp a whole batch with the
 * same watched_at, so season/episode number (descending) breaks ties
 * deterministically. */
export async function fetchWatchedForUserAndShow(
  userId: string,
  showId: number,
): Promise<EpisodeWatched[]> {
  const { data, error } = await supabase
    .from('episode_watched')
    .select('*')
    .eq('user_id', userId)
    .eq('show_id', showId)
    .order('watched_at', { ascending: false })
    .order('season_number', { ascending: false })
    .order('episode_number', { ascending: false })

  if (error) throw error
  return (data ?? []) as EpisodeWatched[]
}

/** Same rows as fetchWatchedForUserAndShow, keyed by season/episode for quick lookup. */
export async function fetchWatchedForShow(userId: string, showId: number): Promise<WatchedMap> {
  const rows = await fetchWatchedForUserAndShow(userId, showId)
  const map: WatchedMap = {}
  for (const row of rows) map[watchedKey(row.season_number, row.episode_number)] = row
  return map
}

export async function fetchRecentWatched(
  userId: string,
  limit = ACTIVITY_FETCH_LIMIT,
): Promise<EpisodeWatched[]> {
  return fetchPaginated<EpisodeWatched>(
    (from, to) =>
      supabase
        .from('episode_watched')
        .select('*')
        .eq('user_id', userId)
        .order('watched_at', { ascending: false })
        .order('id')
        .range(from, to),
    limit,
  )
}

/** Most recent watched-episode rows across the whole group, for the group
 * Activity feed to work out who just finished a show. */
export async function fetchRecentWatchedAllUsers(
  limit = GROUP_ACTIVITY_WATCHED_FETCH_LIMIT,
): Promise<EpisodeWatchedWithUser[]> {
  return fetchPaginated<EpisodeWatchedWithUser>(async (from, to) => {
    const { data, error } = await supabase
      .from('episode_watched')
      .select('*, users(username)')
      .order('watched_at', { ascending: false })
      .order('id')
      .range(from, to)
    return { data: data as unknown as EpisodeWatchedWithUser[] | null, error }
  }, limit)
}

export interface MarkWatchedInput {
  userId: string
  showId: number
  showName: string
  showPosterPath: string | null
  showTotalEpisodes: number | null
  seasonNumber: number
  episodeNumber: number
  episodeName: string | null
  /** Episode runtime in minutes, if known -- powers the "hours watched" stat. */
  runtimeMinutes?: number | null
}

export async function markWatched(input: MarkWatchedInput): Promise<EpisodeWatched> {
  const { data, error } = await supabase
    .from('episode_watched')
    .upsert(
      {
        user_id: input.userId,
        show_id: input.showId,
        show_name: input.showName,
        show_poster_path: input.showPosterPath,
        show_total_episodes: input.showTotalEpisodes,
        season_number: input.seasonNumber,
        episode_number: input.episodeNumber,
        episode_name: input.episodeName,
        watched_at: new Date().toISOString(),
        // Single real-time toggle -- always a known date, overriding any
        // prior unknown-date bulk mark.
        watched_at_unknown: false,
        runtime_minutes: input.runtimeMinutes ?? null,
      },
      { onConflict: 'user_id,show_id,season_number,episode_number' },
    )
    .select()
    .single()

  if (error) throw error
  return data as EpisodeWatched
}

export interface BulkMarkWatchedInput {
  userId: string
  showId: number
  showName: string
  showPosterPath: string | null
  showTotalEpisodes: number | null
  episodes: {
    seasonNumber: number
    episodeNumber: number
    episodeName?: string | null
    /** Episode runtime in minutes, if known -- powers the "hours watched" stat. */
    runtimeMinutes?: number | null
  }[]
  /** ISO timestamp stamped on every row -- lets a bulk log land on the right date in History. */
  watchedAt: string
  /** True if watchedAt is just UNKNOWN_WATCHED_AT rather than a real date. */
  watchedAtUnknown?: boolean
}

/** Marks many episodes watched in one request (e.g. "mark this whole
 * show/season watched"). One upsert, one round trip, instead of looping. */
export async function bulkMarkWatched(input: BulkMarkWatchedInput): Promise<EpisodeWatched[]> {
  if (input.episodes.length === 0) return []
  const rows = input.episodes.map((ep) => ({
    user_id: input.userId,
    show_id: input.showId,
    show_name: input.showName,
    show_poster_path: input.showPosterPath,
    show_total_episodes: input.showTotalEpisodes,
    season_number: ep.seasonNumber,
    episode_number: ep.episodeNumber,
    episode_name: ep.episodeName ?? null,
    watched_at: input.watchedAt,
    watched_at_unknown: input.watchedAtUnknown ?? false,
    runtime_minutes: ep.runtimeMinutes ?? null,
  }))

  const { data, error } = await supabase
    .from('episode_watched')
    .upsert(rows, { onConflict: 'user_id,show_id,season_number,episode_number' })
    .select()

  if (error) throw error
  return (data ?? []) as EpisodeWatched[]
}

export async function unmarkWatched(
  userId: string,
  showId: number,
  seasonNumber: number,
  episodeNumber: number,
): Promise<void> {
  const { error } = await supabase
    .from('episode_watched')
    .delete()
    .eq('user_id', userId)
    .eq('show_id', showId)
    .eq('season_number', seasonNumber)
    .eq('episode_number', episodeNumber)

  if (error) throw error
}

/** Restores episode_watched rows to an exact prior state, to undo a bulk
 * action that overwrote them -- preserves each row's own original
 * watched_at/watched_at_unknown rather than stamping one shared date. */
export async function restoreWatched(rows: EpisodeWatched[]): Promise<EpisodeWatched[]> {
  if (rows.length === 0) return []
  const payload = rows.map((r) => ({
    user_id: r.user_id,
    show_id: r.show_id,
    show_name: r.show_name,
    show_poster_path: r.show_poster_path,
    show_total_episodes: r.show_total_episodes,
    season_number: r.season_number,
    episode_number: r.episode_number,
    episode_name: r.episode_name,
    watched_at: r.watched_at,
    watched_at_unknown: r.watched_at_unknown,
  }))
  const { data, error } = await supabase
    .from('episode_watched')
    .upsert(payload, { onConflict: 'user_id,show_id,season_number,episode_number' })
    .select()

  if (error) throw error
  return (data ?? []) as EpisodeWatched[]
}

/** Deletes many episode_watched rows in one request, to undo a bulk mark that
 * created brand-new rows. Supabase has no OR-of-tuples filter, so this builds
 * one `and(...)` clause per episode and ORs them together. */
export async function bulkUnmarkWatched(
  userId: string,
  showId: number,
  episodes: { seasonNumber: number; episodeNumber: number }[],
): Promise<void> {
  if (episodes.length === 0) return
  const orFilter = episodes
    .map((e) => `and(season_number.eq.${e.seasonNumber},episode_number.eq.${e.episodeNumber})`)
    .join(',')
  const { error } = await supabase
    .from('episode_watched')
    .delete()
    .eq('user_id', userId)
    .eq('show_id', showId)
    .or(orFilter)

  if (error) throw error
}

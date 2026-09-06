import { supabase } from './supabase'
import { fetchPaginated } from './pagination'
import { ACTIVITY_FETCH_LIMIT, GROUP_ACTIVITY_WATCHED_FETCH_LIMIT } from './constants'
import type { EpisodeWatched, EpisodeWatchedWithUser, WatchedMap } from '../types'

/** Builds the season-episode lookup key used by WatchedMap. */
export function watchedKey(seasonNumber: number, episodeNumber: number): string {
  return `${seasonNumber}-${episodeNumber}`
}

export const UNKNOWN_WATCHED_AT = new Date(0).toISOString()

/** Fetches one user's watched episodes for a show, ordered for the per-show watch-history view. */
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
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('watched_at', { ascending: false })
        .order('id')
        .range(from, to),
    limit,
  )
}

/** Same as fetchRecentWatched, but only rows with a real date. */
export async function fetchRecentDatedWatched(
  userId: string,
  limit = ACTIVITY_FETCH_LIMIT,
): Promise<EpisodeWatched[]> {
  return fetchPaginated<EpisodeWatched>(
    (from, to) =>
      supabase
        .from('episode_watched')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('watched_at_unknown', false)
        .order('watched_at', { ascending: false })
        .order('id')
        .range(from, to),
    limit,
  )
}

/** Fetches the most recent watched-episode rows across the whole group, for the Activity feed. */
export async function fetchRecentWatchedAllUsers(
  limit = GROUP_ACTIVITY_WATCHED_FETCH_LIMIT,
): Promise<EpisodeWatchedWithUser[]> {
  return fetchPaginated<EpisodeWatchedWithUser>(async (from, to) => {
    const { data, error, count } = await supabase
      .from('episode_watched')
      .select('*, users(username)', { count: 'exact' })
      .order('watched_at', { ascending: false })
      .order('id')
      .range(from, to)
    return { data: data as unknown as EpisodeWatchedWithUser[] | null, error, count }
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
  runtimeMinutes?: number | null
}

/** Marks a single episode watched, upserting on the user/show/season/episode key. */
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
    runtimeMinutes?: number | null
  }[]
  watchedAt: string
  watchedAtUnknown?: boolean
}

/** Marks many episodes watched in one request instead of looping. */
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

/** Restores episode_watched rows to an exact prior state, to undo a bulk overwrite. */
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

/** Deletes many episode_watched rows in one request, to undo a bulk mark that created new rows. */
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

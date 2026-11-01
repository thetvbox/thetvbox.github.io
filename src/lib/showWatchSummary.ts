import { supabase } from './supabase'
import { fetchPaginated } from './pagination'
import {
  ACTIVITY_FETCH_LIMIT,
  TABLE_EPISODE_WATCHED_SHOW_SUMMARY,
  TABLE_EPISODE_WATCHED_UNDATED_SUMMARY,
} from './constants'
import type { ShowWatchSummary, UndatedShowWatchSummary } from '../types'

/** Fetches the per-show watch rollup, pre-aggregated server-side by the episode_watched_show_summary view. */
export async function fetchShowWatchSummary(userId: string): Promise<ShowWatchSummary[]> {
  const { data, error } = await supabase
    .from(TABLE_EPISODE_WATCHED_SHOW_SUMMARY)
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  return (data ?? []) as ShowWatchSummary[]
}

/** Every member's per-show watch rollup, for the group Activity feed (one row per member and show). */
export async function fetchShowWatchSummaryAllUsers(limit = ACTIVITY_FETCH_LIMIT): Promise<ShowWatchSummary[]> {
  return fetchPaginated<ShowWatchSummary>(async (from, to) => {
    const { data, error, count } = await supabase
      .from(TABLE_EPISODE_WATCHED_SHOW_SUMMARY)
      .select('*', { count: 'exact' })
      .order('user_id')
      .order('show_id')
      .range(from, to)
    return { data: data as ShowWatchSummary[] | null, error, count }
  }, limit)
}

/** Fetches the per-show rollup of "watched a while ago" rows with no real date. */
export async function fetchUndatedShowWatchSummary(userId: string): Promise<UndatedShowWatchSummary[]> {
  const { data, error } = await supabase
    .from(TABLE_EPISODE_WATCHED_UNDATED_SUMMARY)
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  return (data ?? []) as UndatedShowWatchSummary[]
}

import { supabase } from './supabase'
import { TABLE_EPISODE_WATCHED_SHOW_SUMMARY, TABLE_EPISODE_WATCHED_UNDATED_SUMMARY } from './constants'
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

/** Fetches the per-show rollup of "watched a while ago" rows with no real date. */
export async function fetchUndatedShowWatchSummary(userId: string): Promise<UndatedShowWatchSummary[]> {
  const { data, error } = await supabase
    .from(TABLE_EPISODE_WATCHED_UNDATED_SUMMARY)
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  return (data ?? []) as UndatedShowWatchSummary[]
}

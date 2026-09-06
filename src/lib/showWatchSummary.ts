import { supabase } from './supabase'
import type { ShowWatchSummary, UndatedShowWatchSummary } from '../types'

/** Fetches the per-show watch rollup, pre-aggregated server-side by the episode_watched_show_summary view. */
export async function fetchShowWatchSummary(userId: string): Promise<ShowWatchSummary[]> {
  const { data, error } = await supabase
    .from('episode_watched_show_summary')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  return (data ?? []) as ShowWatchSummary[]
}

/** Fetches the per-show rollup of "watched a while ago" rows with no real date. */
export async function fetchUndatedShowWatchSummary(userId: string): Promise<UndatedShowWatchSummary[]> {
  const { data, error } = await supabase
    .from('episode_watched_undated_summary')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  return (data ?? []) as UndatedShowWatchSummary[]
}

import { supabase } from './supabase'
import type { ShowWatchSummary, UndatedShowWatchSummary } from '../types'

/** Per-show rollup of episode_watched, computed in Postgres (see the
 * episode_watched_show_summary view in schema.sql) instead of shipping every
 * individual episode row to the client -- a heavy history (10k+ rows) is
 * still just one row per distinct show here. Powers ProfileActivity's stat
 * cards and History tab via summarizeFromWatchSummary, neither of which ever
 * needed individual-episode detail.
 *
 * Not paginated: result size is bounded by distinct shows watched, not by
 * episode count -- realistically always far below PostgREST's 1000-row cap. */
export async function fetchShowWatchSummary(userId: string): Promise<ShowWatchSummary[]> {
  const { data, error } = await supabase
    .from('episode_watched_show_summary')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  return (data ?? []) as ShowWatchSummary[]
}

/** Per-show rollup of just the "watched a while ago" (no real date) rows --
 * see episode_watched_undated_summary in schema.sql. Powers
 * buildUndatedDiaryEntriesFromSummary, the aggregate-based replacement for
 * the old per-row buildUndatedDiaryEntries -- a bulk "mark whole show
 * watched" import is exactly the case that can dump thousands of undated
 * rows for one show, so this is the more consequential of the two views in
 * practice (see schema.sql's comment for real numbers). */
export async function fetchUndatedShowWatchSummary(userId: string): Promise<UndatedShowWatchSummary[]> {
  const { data, error } = await supabase
    .from('episode_watched_undated_summary')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  return (data ?? []) as UndatedShowWatchSummary[]
}

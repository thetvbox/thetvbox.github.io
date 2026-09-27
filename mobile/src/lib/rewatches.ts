import { supabase } from './supabase'
import { fetchPaginated } from './pagination'
import { ACTIVITY_FETCH_LIMIT, TABLE_SHOW_REWATCHES } from './constants'
import type { ShowRewatch } from '../types'

/** Sorts a rewatch list newest-first by rewatchedAt. */
export function sortRewatchesDesc(rows: ShowRewatch[]): ShowRewatch[] {
  return [...rows].sort((a, b) => b.rewatched_at.localeCompare(a.rewatched_at))
}

export async function fetchRewatchesForShow(userId: string, showId: number): Promise<ShowRewatch[]> {
  const { data, error } = await supabase
    .from(TABLE_SHOW_REWATCHES)
    .select('*')
    .eq('user_id', userId)
    .eq('show_id', showId)
    .order('rewatched_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as ShowRewatch[]
}

export async function fetchRecentRewatches(
  userId: string,
  limit = ACTIVITY_FETCH_LIMIT,
): Promise<ShowRewatch[]> {
  return fetchPaginated<ShowRewatch>(
    (from, to) =>
      supabase
        .from(TABLE_SHOW_REWATCHES)
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('rewatched_at', { ascending: false })
        .order('id')
        .range(from, to),
    limit,
  )
}

export interface LogRewatchInput {
  userId: string
  showId: number
  showName: string
  showPosterPath: string | null
  rewatchedAt: string
}

/** Logs one rewatch event as a plain insert, since duplicate rewatches are expected. */
export async function logRewatch(input: LogRewatchInput): Promise<ShowRewatch> {
  const { data, error } = await supabase
    .from(TABLE_SHOW_REWATCHES)
    .insert({
      user_id: input.userId,
      show_id: input.showId,
      show_name: input.showName,
      show_poster_path: input.showPosterPath,
      rewatched_at: input.rewatchedAt,
    })
    .select()
    .single()

  if (error) throw error
  return data as ShowRewatch
}

export async function deleteRewatch(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE_SHOW_REWATCHES).delete().eq('id', id)
  if (error) throw error
}

/** Re-inserts a deleted rewatch, preserving its original rewatched_at, to undo deleteRewatch. */
export async function restoreRewatch(row: ShowRewatch): Promise<ShowRewatch> {
  const { data, error } = await supabase
    .from(TABLE_SHOW_REWATCHES)
    .insert({
      user_id: row.user_id,
      show_id: row.show_id,
      show_name: row.show_name,
      show_poster_path: row.show_poster_path,
      rewatched_at: row.rewatched_at,
    })
    .select()
    .single()

  if (error) throw error
  return data as ShowRewatch
}

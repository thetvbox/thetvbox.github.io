import { supabase } from './supabase'
import { TABLE_SHOW_WATCHING_DISMISSED } from './constants'
import type { ShowWatchingDismissed } from '../types'

/** Fetches all shows one user has hidden from Now Watching. */
export async function fetchDismissedForUser(userId: string): Promise<ShowWatchingDismissed[]> {
  const { data, error } = await supabase.from(TABLE_SHOW_WATCHING_DISMISSED).select('*').eq('user_id', userId)

  if (error) throw error
  return (data ?? []) as ShowWatchingDismissed[]
}

/** Fetches one user's dismissed status for a single show, or null if not dismissed. */
export async function fetchDismissedItem(userId: string, showId: number): Promise<ShowWatchingDismissed | null> {
  const { data, error } = await supabase
    .from(TABLE_SHOW_WATCHING_DISMISSED)
    .select('*')
    .eq('user_id', userId)
    .eq('show_id', showId)
    .maybeSingle()

  if (error) throw error
  return (data as ShowWatchingDismissed) ?? null
}

/** Hides a show from Now Watching without touching its actual progress. */
export async function dismissShow(userId: string, showId: number): Promise<ShowWatchingDismissed> {
  const { data, error } = await supabase
    .from(TABLE_SHOW_WATCHING_DISMISSED)
    .upsert(
      { user_id: userId, show_id: showId, dismissed_at: new Date().toISOString() },
      { onConflict: 'user_id,show_id' },
    )
    .select()
    .single()

  if (error) throw error
  return data as ShowWatchingDismissed
}

/** Un-hides a show from Now Watching. */
export async function undismissShow(userId: string, showId: number): Promise<void> {
  const { error } = await supabase
    .from(TABLE_SHOW_WATCHING_DISMISSED)
    .delete()
    .eq('user_id', userId)
    .eq('show_id', showId)

  if (error) throw error
}

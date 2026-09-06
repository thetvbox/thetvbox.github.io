import { supabase } from './supabase'
import type { ShowStarted } from '../types'

/** Fetches all shows one user has explicitly started. */
export async function fetchStartedForUser(userId: string): Promise<ShowStarted[]> {
  const { data, error } = await supabase.from('show_started').select('*').eq('user_id', userId)

  if (error) throw error
  return (data ?? []) as ShowStarted[]
}

/** Fetches one user's started status for a single show, or null if not started. */
export async function fetchStartedItem(userId: string, showId: number): Promise<ShowStarted | null> {
  const { data, error } = await supabase
    .from('show_started')
    .select('*')
    .eq('user_id', userId)
    .eq('show_id', showId)
    .maybeSingle()

  if (error) throw error
  return (data as ShowStarted) ?? null
}

export interface StartShowInput {
  userId: string
  showId: number
  showName: string
  showPosterPath: string | null
  showTotalEpisodes: number | null
}

/** Records a "start watching" declaration without touching episode_watched. */
export async function startShow(input: StartShowInput): Promise<ShowStarted> {
  const { data, error } = await supabase
    .from('show_started')
    .upsert(
      {
        user_id: input.userId,
        show_id: input.showId,
        show_name: input.showName,
        show_poster_path: input.showPosterPath,
        show_total_episodes: input.showTotalEpisodes,
        started_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,show_id' },
    )
    .select()
    .single()

  if (error) throw error
  return data as ShowStarted
}

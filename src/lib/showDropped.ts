import { supabase } from './supabase'
import { TABLE_SHOW_DROPPED } from './constants'
import type { ShowDropped } from '../types'

/** Fetches all shows one user has dropped. */
export async function fetchDroppedForUser(userId: string): Promise<ShowDropped[]> {
  const { data, error } = await supabase
    .from(TABLE_SHOW_DROPPED)
    .select('*')
    .eq('user_id', userId)
    .order('dropped_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as ShowDropped[]
}

/** Fetches one user's dropped status for a single show, or null if not dropped. */
export async function fetchDroppedItem(userId: string, showId: number): Promise<ShowDropped | null> {
  const { data, error } = await supabase
    .from(TABLE_SHOW_DROPPED)
    .select('*')
    .eq('user_id', userId)
    .eq('show_id', showId)
    .maybeSingle()

  if (error) throw error
  return (data as ShowDropped) ?? null
}

export interface DropShowInput {
  userId: string
  showId: number
  showName: string
  showPosterPath: string | null
}

/** Marks a show as deliberately dropped, upserting so a repeat drop no-ops. */
export async function dropShow(input: DropShowInput): Promise<ShowDropped> {
  const { data, error } = await supabase
    .from(TABLE_SHOW_DROPPED)
    .upsert(
      {
        user_id: input.userId,
        show_id: input.showId,
        show_name: input.showName,
        show_poster_path: input.showPosterPath,
        dropped_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,show_id' },
    )
    .select()
    .single()

  if (error) throw error
  return data as ShowDropped
}

/** Resumes a dropped show. */
export async function undropShow(userId: string, showId: number): Promise<void> {
  const { error } = await supabase.from(TABLE_SHOW_DROPPED).delete().eq('user_id', userId).eq('show_id', showId)
  if (error) throw error
}

import { supabase } from './supabase'
import type { ShowDropped } from '../types'

/** All shows one user has dropped -- see Profile's Dropped tab. */
export async function fetchDroppedForUser(userId: string): Promise<ShowDropped[]> {
  const { data, error } = await supabase
    .from('show_dropped')
    .select('*')
    .eq('user_id', userId)
    .order('dropped_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as ShowDropped[]
}

/** One user's dropped status for a single show, or null if it isn't dropped.
 * Powers the toggle on the show's own page -- see ShowDetail.tsx. */
export async function fetchDroppedItem(userId: string, showId: number): Promise<ShowDropped | null> {
  const { data, error } = await supabase
    .from('show_dropped')
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

/** "Drop this show" -- like dismissShow, but a deliberate status with its own
 * visible list (Profile's Dropped tab) rather than a silent Now Watching
 * hide. Upsert since re-dropping an already-dropped show should just no-op
 * cleanly. */
export async function dropShow(input: DropShowInput): Promise<ShowDropped> {
  const { data, error } = await supabase
    .from('show_dropped')
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

/** "Resume watching" -- used both for the explicit resume action and as a
 * best-effort side effect whenever new progress is logged for a dropped show
 * (see clearDropped in useShowDetail.ts). Plain delete, already a no-op when
 * nothing matches. */
export async function undropShow(userId: string, showId: number): Promise<void> {
  const { error } = await supabase.from('show_dropped').delete().eq('user_id', userId).eq('show_id', showId)
  if (error) throw error
}

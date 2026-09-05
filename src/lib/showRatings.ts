import { supabase } from './supabase'
import { fetchPaginated } from './pagination'
import { ACTIVITY_FETCH_LIMIT, GROUP_ACTIVITY_FETCH_LIMIT } from './constants'
import type { ShowRating, ShowRatingWithUser } from '../types'

/** One user's rating for one show, or null if they haven't rated it. */
export async function fetchShowRating(userId: string, showId: number): Promise<ShowRating | null> {
  const { data, error } = await supabase
    .from('show_ratings')
    .select('*')
    .eq('user_id', userId)
    .eq('show_id', showId)
    .maybeSingle()

  if (error) throw error
  return (data as ShowRating) ?? null
}

/** Every rating (from every user) for a given show, joined with usernames. */
export async function fetchAllShowRatings(showId: number): Promise<ShowRatingWithUser[]> {
  const { data, error } = await supabase
    .from('show_ratings')
    .select('*, users(username)')
    .eq('show_id', showId)

  if (error) throw error
  return (data ?? []) as unknown as ShowRatingWithUser[]
}

export async function fetchRecentShowRatings(
  userId: string,
  limit = ACTIVITY_FETCH_LIMIT,
): Promise<ShowRating[]> {
  return fetchPaginated<ShowRating>(
    (from, to) =>
      supabase
        .from('show_ratings')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('rated_at', { ascending: false })
        .order('id')
        .range(from, to),
    limit,
  )
}

/** Most recent ratings across the whole group (every user), for the group Activity feed. */
export async function fetchRecentShowRatingsAllUsers(
  limit = GROUP_ACTIVITY_FETCH_LIMIT,
): Promise<ShowRatingWithUser[]> {
  return fetchPaginated<ShowRatingWithUser>(async (from, to) => {
    const { data, error, count } = await supabase
      .from('show_ratings')
      .select('*, users(username)', { count: 'exact' })
      .order('rated_at', { ascending: false })
      .order('id')
      .range(from, to)
    return { data: data as unknown as ShowRatingWithUser[] | null, error, count }
  }, limit)
}

export interface UpsertShowRatingInput {
  userId: string
  showId: number
  showName: string
  showPosterPath: string | null
  rating: number
}

export async function upsertShowRating(input: UpsertShowRatingInput): Promise<ShowRating> {
  const { data, error } = await supabase
    .from('show_ratings')
    .upsert(
      {
        user_id: input.userId,
        show_id: input.showId,
        show_name: input.showName,
        show_poster_path: input.showPosterPath,
        rating: input.rating,
        rated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,show_id' },
    )
    .select()
    .single()

  if (error) throw error
  return data as ShowRating
}

export async function deleteShowRating(userId: string, showId: number): Promise<void> {
  const { error } = await supabase
    .from('show_ratings')
    .delete()
    .eq('user_id', userId)
    .eq('show_id', showId)

  if (error) throw error
}

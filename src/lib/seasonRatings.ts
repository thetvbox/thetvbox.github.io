import { supabase } from './supabase'
import { fetchPaginated } from './pagination'
import { GROUP_ACTIVITY_FETCH_LIMIT } from './constants'
import type { SeasonRating, SeasonRatingWithUser } from '../types'

/** Fetches every season rating for a show, joined with usernames. */
export async function fetchAllSeasonRatingsForShow(showId: number): Promise<SeasonRatingWithUser[]> {
  const { data, error } = await supabase
    .from('season_ratings')
    .select('*, users(username)')
    .eq('show_id', showId)

  if (error) throw error
  return (data ?? []) as unknown as SeasonRatingWithUser[]
}

/** Fetches the most recent season ratings across the whole group, for the group Activity feed. */
export async function fetchRecentSeasonRatingsAllUsers(
  limit = GROUP_ACTIVITY_FETCH_LIMIT,
): Promise<SeasonRatingWithUser[]> {
  return fetchPaginated<SeasonRatingWithUser>(async (from, to) => {
    const { data, error, count } = await supabase
      .from('season_ratings')
      .select('*, users(username)', { count: 'exact' })
      .order('rated_at', { ascending: false })
      .order('id')
      .range(from, to)
    return { data: data as unknown as SeasonRatingWithUser[] | null, error, count }
  }, limit)
}

export interface UpsertSeasonRatingInput {
  userId: string
  showId: number
  showName: string
  showPosterPath: string | null
  seasonNumber: number
  seasonName: string | null
  rating: number
}

export async function upsertSeasonRating(input: UpsertSeasonRatingInput): Promise<SeasonRating> {
  const { data, error } = await supabase
    .from('season_ratings')
    .upsert(
      {
        user_id: input.userId,
        show_id: input.showId,
        show_name: input.showName,
        show_poster_path: input.showPosterPath,
        season_number: input.seasonNumber,
        season_name: input.seasonName,
        rating: input.rating,
        rated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,show_id,season_number' },
    )
    .select()
    .single()

  if (error) throw error
  return data as SeasonRating
}

export async function deleteSeasonRating(
  userId: string,
  showId: number,
  seasonNumber: number,
): Promise<void> {
  const { error } = await supabase
    .from('season_ratings')
    .delete()
    .eq('user_id', userId)
    .eq('show_id', showId)
    .eq('season_number', seasonNumber)

  if (error) throw error
}

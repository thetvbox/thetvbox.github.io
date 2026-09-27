import { supabase } from './supabase'
import { fetchPaginated } from './pagination'
import { GROUP_ACTIVITY_FETCH_LIMIT, TABLE_FOLLOWS, TABLE_USERS } from './constants'
import type { AppUser, Follow } from '../types'

/** Fetches every id the current user follows. */
export async function fetchFollowingIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from(TABLE_FOLLOWS).select('followed_id').eq('follower_id', userId)
  if (error) throw error
  return new Set((data ?? []).map((r) => r.followed_id as string))
}

/** Fetches every id that follows this user. */
export async function fetchFollowerIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from(TABLE_FOLLOWS).select('follower_id').eq('followed_id', userId)
  if (error) throw error
  return new Set((data ?? []).map((r) => r.follower_id as string))
}

export async function isFollowingUser(followerId: string, followedId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from(TABLE_FOLLOWS)
    .select('id')
    .eq('follower_id', followerId)
    .eq('followed_id', followedId)
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

export async function fetchFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  const [followers, following] = await Promise.all([
    supabase.from(TABLE_FOLLOWS).select('id', { count: 'exact', head: true }).eq('followed_id', userId),
    supabase.from(TABLE_FOLLOWS).select('id', { count: 'exact', head: true }).eq('follower_id', userId),
  ])
  if (followers.error) throw followers.error
  if (following.error) throw following.error
  return { followers: followers.count ?? 0, following: following.count ?? 0 }
}

export async function followUser(followerId: string, followedId: string): Promise<Follow> {
  const { data, error } = await supabase
    .from(TABLE_FOLLOWS)
    .insert({ follower_id: followerId, followed_id: followedId })
    .select()
    .single()

  if (error) throw error
  return data as Follow
}

export async function unfollowUser(followerId: string, followedId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE_FOLLOWS)
    .delete()
    .eq('follower_id', followerId)
    .eq('followed_id', followedId)

  if (error) throw error
}

/** Resolves user ids to AppUser rows in the same order as the input. */
async function resolveUsersInOrder(ids: string[]): Promise<AppUser[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase.from(TABLE_USERS).select('*').in('id', ids)
  if (error) throw error
  const byId = new Map((data ?? []).map((u) => [(u as AppUser).id, u as AppUser]))
  return ids.map((id) => byId.get(id)).filter((u): u is AppUser => Boolean(u))
}

/** Fetches followers of userId, most recently followed first. */
export async function fetchFollowersWithUsers(userId: string): Promise<AppUser[]> {
  const { data, error } = await supabase
    .from(TABLE_FOLLOWS)
    .select('follower_id, created_at')
    .eq('followed_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return resolveUsersInOrder((data ?? []).map((r) => r.follower_id as string))
}

/** Fetches who userId follows, most recently followed first. */
export async function fetchFollowingWithUsers(userId: string): Promise<AppUser[]> {
  const { data, error } = await supabase
    .from(TABLE_FOLLOWS)
    .select('followed_id, created_at')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return resolveUsersInOrder((data ?? []).map((r) => r.followed_id as string))
}

/** Fetches every follow edge across the group, for the Activity feed's follow events. */
export async function fetchAllFollows(limit = GROUP_ACTIVITY_FETCH_LIMIT): Promise<Follow[]> {
  return fetchPaginated<Follow>(
    (from, to) =>
      supabase
        .from(TABLE_FOLLOWS)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .order('id')
        .range(from, to),
    limit,
  )
}

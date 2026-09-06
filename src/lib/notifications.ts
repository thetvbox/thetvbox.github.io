import { supabase } from './supabase'
import { MS_PER_DAY, NOTIFICATIONS_STALE_SEEN_DAYS, NOTIFICATION_FETCH_LIMIT, TABLE_NOTIFICATIONS } from './constants'
import type { Notification } from '../types'

/** Fetches the most recent notifications for userId, newest first, seen and unseen alike. */
export async function fetchNotifications(userId: string, limit = NOTIFICATION_FETCH_LIMIT): Promise<Notification[]> {
  const { data, error } = await supabase
    .from(TABLE_NOTIFICATIONS)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as Notification[]
}

/** Fetches the unseen notification count for userId. */
export async function fetchUnseenNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE_NOTIFICATIONS)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('seen_at', null)

  if (error) throw error
  return count ?? 0
}

/** Marks every unseen notification seen, then prunes rows seen long enough ago. */
export async function markNotificationsSeenAndPrune(userId: string): Promise<void> {
  const { error: seenError } = await supabase
    .from(TABLE_NOTIFICATIONS)
    .update({ seen_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('seen_at', null)

  if (seenError) throw seenError

  const staleCutoff = new Date(Date.now() - NOTIFICATIONS_STALE_SEEN_DAYS * MS_PER_DAY).toISOString()
  const { error: pruneError } = await supabase
    .from(TABLE_NOTIFICATIONS)
    .delete()
    .eq('user_id', userId)
    .not('seen_at', 'is', null)
    .lt('seen_at', staleCutoff)

  if (pruneError) throw pruneError
}

/** Deletes every notification for userId outright, seen or not. */
export async function clearAllNotifications(userId: string): Promise<void> {
  const { error } = await supabase.from(TABLE_NOTIFICATIONS).delete().eq('user_id', userId)
  if (error) throw error
}

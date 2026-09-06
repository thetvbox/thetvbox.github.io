import { supabase } from './supabase'
import { NOTIFICATIONS_STALE_SEEN_DAYS } from './constants'
import type { Notification } from '../types'

/** Fetches the most recent notifications for userId, newest first, seen and unseen alike. */
export async function fetchNotifications(userId: string, limit = 30): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
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
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('seen_at', null)

  if (error) throw error
  return count ?? 0
}

/** Marks every unseen notification seen, then prunes rows seen long enough ago. */
export async function markNotificationsSeenAndPrune(userId: string): Promise<void> {
  const { error: seenError } = await supabase
    .from('notifications')
    .update({ seen_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('seen_at', null)

  if (seenError) throw seenError

  const staleCutoff = new Date(Date.now() - NOTIFICATIONS_STALE_SEEN_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { error: pruneError } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .not('seen_at', 'is', null)
    .lt('seen_at', staleCutoff)

  if (pruneError) throw pruneError
}

/** Deletes every notification for userId outright, seen or not. */
export async function clearAllNotifications(userId: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('user_id', userId)
  if (error) throw error
}

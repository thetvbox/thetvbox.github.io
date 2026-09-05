import { supabase } from './supabase'
import { NOTIFICATIONS_STALE_SEEN_DAYS } from './constants'
import type { Notification } from '../types'

/** Most recent notifications for userId, newest first -- powers
 * NotificationsBell's panel. Seen and unseen rows are both included (seen
 * ones just render dimmed) so the panel doesn't look empty right after
 * opening it once and clearing the badge. */
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

/** Unseen count for userId -- powers the bell's badge dot/number. */
export async function fetchUnseenNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('seen_at', null)

  if (error) throw error
  return count ?? 0
}

/** Marks every unseen notification as seen (stamping seen_at, not deleting --
 * an instant vanish-on-open would be jarring while the user is still reading
 * them), then opportunistically prunes anything seen long enough ago that it
 * no longer needs to stick around. Both run every time the panel opens; there's
 * no server cron here, so this is the only place old rows ever get cleaned up. */
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

/** Explicit "Clear all" affordance -- deletes every notification for userId
 * outright, seen or not, rather than waiting for the seen-based prune above. */
export async function clearAllNotifications(userId: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('user_id', userId)
  if (error) throw error
}

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useEscapeAndFocusReturn } from '../hooks/useEscapeAndFocusReturn'
import { useCloseOnNavigate } from '../hooks/useCloseOnNavigate'
import {
  clearAllNotifications,
  fetchNotifications,
  fetchUnseenNotificationCount,
  markNotificationsSeenAndPrune,
} from '../lib/notifications'
import { formatShortDate } from '../lib/date'
import {
  DROPDOWN_PANEL_ANIMATE,
  DROPDOWN_PANEL_EXIT,
  DROPDOWN_PANEL_INITIAL,
  DROPDOWN_PANEL_TRANSITION,
} from '../lib/motion'
import { NOTIFICATIONS_POLL_MS, SKELETON_ROWS_COMPACT } from '../lib/constants'
import Avatar from './Avatar'
import PosterThumb from './PosterThumb'
import type { Notification } from '../types'

interface NotificationsBellProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Bell icon in the top bar -- unseen badge, opens an inline dropdown of
 * recent follow / show-rated / show-finished activity from people the user
 * follows. The panel anchors to Navbar's shared utility-cluster container,
 * not this component's own root -- same reasoning as ReportBugButton.tsx.
 * Controlled by Navbar so opening this closes ReportBugButton's panel and
 * vice versa. */
export default function NotificationsBell({ open, onOpenChange }: NotificationsBellProps) {
  const { user: me } = useAuth()
  const [unseen, setUnseen] = useState(0)

  // Navbar never unmounts across route changes -- without this, tapping a
  // nav link while this panel is open leaves it floating over the new page.
  useCloseOnNavigate(() => onOpenChange(false))

  useEffect(() => {
    if (!me) return
    const userId = me.id
    let cancelled = false

    function refresh() {
      fetchUnseenNotificationCount(userId)
        .then((count) => {
          if (!cancelled) setUnseen(count)
        })
        .catch(() => {
          // Silent -- a failed unseen-count fetch shouldn't disrupt the rest
          // of the app. Worst case, the badge just doesn't show up.
        })
    }

    refresh()
    // Navbar (and this bell) mounts once for the whole session rather than
    // per-route, so without polling a new notification picked up mid-session
    // would never show up until a hard reload. A minute is frequent enough
    // to feel "live" without hammering Supabase on a low-stakes badge count.
    const interval = window.setInterval(refresh, NOTIFICATIONS_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [me])

  if (!me) return null

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-label={unseen > 0 ? `Notifications, ${unseen} new` : 'Notifications'}
        aria-expanded={open}
        title="Notifications"
        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base-400 transition duration-200 hover:bg-hover hover:text-base-100 active:scale-90"
      >
        <BellGlyph />
        {unseen > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[9px] font-semibold leading-none text-base-950 ring-2 ring-base-950">
            {unseen > 9 ? '9+' : unseen}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <NotificationsPanel userId={me.id} onSeen={() => setUnseen(0)} onClose={() => onOpenChange(false)} />
        )}
      </AnimatePresence>
    </>
  )
}

function BellGlyph() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  )
}

/** Small per-type badge shown at the corner of the actor's avatar -- gives
 * each notification a glanceable shape (follow vs. rated vs. finished)
 * without having to read the sentence first. */
function TypeBadge({ type }: { type: Notification['type'] }) {
  if (type === 'follow') {
    return (
      <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent-500 text-base-950 ring-2 ring-base-900">
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
    )
  }
  if (type === 'show_rated') {
    return (
      <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-star text-base-950 ring-2 ring-base-900">
        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.5l2.9 6.15 6.6.72-4.95 4.6 1.3 6.53L12 17.3l-5.85 3.2 1.3-6.53-4.95-4.6 6.6-.72L12 2.5z" />
        </svg>
      </span>
    )
  }
  return (
    <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent-300 text-base-950 ring-2 ring-base-900">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12l5 5L20 6" />
      </svg>
    </span>
  )
}

/** The one-line description for a notification, shared between the copy
 * conventions ActivityRow already established ("finished X" / "rated X"). */
function NotificationText({ n }: { n: Notification }) {
  if (n.type === 'follow') {
    return (
      <p className="min-w-0 flex-1 truncate text-xs text-base-200">
        <span className="font-medium text-base-100">@{n.actor_username}</span> started following you
      </p>
    )
  }
  if (n.type === 'show_rated') {
    return (
      <p className="min-w-0 flex-1 truncate text-xs text-base-200">
        <span className="font-medium text-base-100">@{n.actor_username}</span> rated{' '}
        <span className="font-medium">{n.show_name}</span>
        {n.rating !== null && <span className="text-base-400"> · {n.rating.toFixed(1)}★</span>}
      </p>
    )
  }
  return (
    <p className="min-w-0 flex-1 truncate text-xs text-base-200">
      <span className="font-medium text-base-100">@{n.actor_username}</span> finished{' '}
      <span className="font-medium">{n.show_name}</span>
      {n.episode_count ? <span className="text-base-400"> · {n.episode_count} episodes</span> : null}
    </p>
  )
}

function notificationHref(n: Notification): string {
  if (n.type === 'follow') return `/u/${n.actor_username}`
  return `/u/${n.actor_username}/shows/${n.show_id}`
}

function NotificationsPanel({
  userId,
  onSeen,
  onClose,
}: {
  userId: string
  onSeen: () => void
  onClose: () => void
}) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)

  useEscapeAndFocusReturn(true, onClose)

  useEffect(() => {
    let cancelled = false
    fetchNotifications(userId)
      .then((rows) => {
        if (!cancelled) setNotifications(rows)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load notifications.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    // Fire-and-forget: if this fails, the badge just reappears next time
    // fetchUnseenNotificationCount runs -- a harmless, self-healing
    // fallback, not worth surfacing an error for. Also opportunistically
    // prunes anything seen more than a day ago, since there's no server
    // cron here -- see lib/notifications.ts.
    markNotificationsSeenAndPrune(userId)
      .then(onSeen)
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function handleClearAll() {
    setClearing(true)
    try {
      await clearAllNotifications(userId)
      setNotifications([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear notifications.')
    } finally {
      setClearing(false)
    }
  }

  return (
    <motion.div
      layout
      initial={DROPDOWN_PANEL_INITIAL}
      animate={DROPDOWN_PANEL_ANIMATE}
      exit={DROPDOWN_PANEL_EXIT}
      transition={DROPDOWN_PANEL_TRANSITION}
      className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] origin-top-right rounded-xl border border-hairline-strong bg-base-900 p-3.5 shadow-xl shadow-black/20"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-base-500">Notifications</p>
        <div className="flex items-center gap-3">
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              disabled={clearing}
              className="text-xs text-base-500 hover:text-base-300 disabled:opacity-40"
            >
              {clearing ? 'Clearing…' : 'Clear all'}
            </button>
          )}
          <button type="button" onClick={onClose} className="text-xs text-base-500 hover:text-base-300">
            Close
          </button>
        </div>
      </div>

      {error && <p className="mb-2 text-xs text-danger">{error}</p>}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: SKELETON_ROWS_COMPACT }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-base-850/70" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <p className="py-3 text-center text-xs text-base-500">
          Nothing yet -- follow some people to see their activity here.
        </p>
      ) : (
        <ul className="max-h-96 space-y-1 overflow-y-auto">
          {notifications.map((n) => (
            <li key={n.id}>
              <Link
                to={notificationHref(n)}
                onClick={onClose}
                className={`flex items-center gap-2.5 rounded-lg p-1.5 transition-colors duration-200 hover:bg-hover ${
                  n.seen_at ? '' : 'bg-accent-500/5'
                }`}
              >
                <span className="relative shrink-0">
                  <Avatar username={n.actor_username} size="xs" />
                  <TypeBadge type={n.type} />
                </span>
                {n.type !== 'follow' && <PosterThumb posterPath={n.show_poster_path} size="sm" />}
                <NotificationText n={n} />
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {!n.seen_at && <span className="h-1.5 w-1.5 rounded-full bg-accent-400" aria-hidden="true" />}
                  <span className="text-[10px] text-base-500">{formatShortDate(n.created_at)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  )
}

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useEscapeAndFocusReturn } from '../hooks/useEscapeAndFocusReturn'
import { useCloseOnNavigate } from '../hooks/useCloseOnNavigate'
import {
  fetchNewFollowerCount,
  fetchRecentFollowerNotifications,
  markFollowNotificationsSeen,
} from '../lib/follows'
import type { RecentFollowerNotification } from '../lib/follows'
import { formatShortDate } from '../lib/date'
import {
  DROPDOWN_PANEL_ANIMATE,
  DROPDOWN_PANEL_EXIT,
  DROPDOWN_PANEL_INITIAL,
  DROPDOWN_PANEL_TRANSITION,
} from '../lib/motion'
import { NOTIFICATIONS_POLL_MS } from '../lib/constants'
import Avatar from './Avatar'

interface NotificationsBellProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Bell icon in the top bar -- unread dot for new followers, opens an inline
 * dropdown of recent "X followed you" events. Panel is `absolute right-0`
 * off its own trigger with a fixed, modest width so it stays fully on-screen
 * regardless of where this icon lands among the other top-bar icons -- see
 * ReportBugButton.tsx, which uses the same pattern. Controlled by Navbar so
 * opening this closes ReportBugButton's panel and vice versa. */
export default function NotificationsBell({ open, onOpenChange }: NotificationsBellProps) {
  const { user: me } = useAuth()
  const [unread, setUnread] = useState(0)

  // Navbar never unmounts across route changes -- without this, tapping a
  // nav link while this panel is open leaves it floating over the new page.
  useCloseOnNavigate(() => onOpenChange(false))

  useEffect(() => {
    if (!me) return
    const userId = me.id
    let cancelled = false

    function refresh() {
      fetchNewFollowerCount(userId)
        .then((count) => {
          if (!cancelled) setUnread(count)
        })
        .catch(() => {
          // Silent -- a failed unread-count fetch shouldn't disrupt the rest
          // of the app. Worst case, the dot just doesn't show up.
        })
    }

    refresh()
    // Navbar (and this bell) mounts once for the whole session rather than
    // per-route, so without polling a new follower picked up mid-session
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
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-label={unread > 0 ? `Notifications, ${unread} new` : 'Notifications'}
        aria-expanded={open}
        title="Notifications"
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base-400 transition-colors duration-200 hover:bg-hover hover:text-base-100"
      >
        <BellGlyph />
        {unread > 0 && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent-400 ring-2 ring-base-950" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <NotificationsPanel userId={me.id} onSeen={() => setUnread(0)} onClose={() => onOpenChange(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function BellGlyph() {
  return (
    <svg
      width="20"
      height="20"
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

function NotificationsPanel({
  userId,
  onSeen,
  onClose,
}: {
  userId: string
  onSeen: () => void
  onClose: () => void
}) {
  const [notifications, setNotifications] = useState<RecentFollowerNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEscapeAndFocusReturn(true, onClose)

  useEffect(() => {
    let cancelled = false
    fetchRecentFollowerNotifications(userId)
      .then((rows) => {
        if (!cancelled) setNotifications(rows)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load notifications.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    // Fire-and-forget: if this fails, the unread dot just reappears next
    // time fetchNewFollowerCount runs -- a harmless, self-healing fallback,
    // not worth surfacing an error for.
    markFollowNotificationsSeen(userId)
      .then(onSeen)
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  return (
    <motion.div
      layout
      initial={DROPDOWN_PANEL_INITIAL}
      animate={DROPDOWN_PANEL_ANIMATE}
      exit={DROPDOWN_PANEL_EXIT}
      transition={DROPDOWN_PANEL_TRANSITION}
      className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] origin-top-right rounded-xl border border-hairline-strong bg-base-900 p-3.5 shadow-xl shadow-black/20"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-base-500">Notifications</p>
        <button type="button" onClick={onClose} className="text-xs text-base-500 hover:text-base-300">
          Close
        </button>
      </div>

      {error && <p className="mb-2 text-xs text-danger">{error}</p>}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-base-850/70" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <p className="py-3 text-center text-xs text-base-500">No new followers yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {notifications.map((n) => (
            <li key={n.followId}>
              <Link
                to={`/u/${n.followerUsername}`}
                onClick={onClose}
                className="flex items-center gap-2.5 rounded-lg p-1.5 transition-colors duration-200 hover:bg-hover"
              >
                <Avatar username={n.followerUsername} size="xs" />
                <p className="min-w-0 flex-1 truncate text-xs text-base-200">
                  <span className="font-medium text-base-100">@{n.followerUsername}</span> started following you
                </p>
                <span className="shrink-0 text-[10px] text-base-500">{formatShortDate(n.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  )
}

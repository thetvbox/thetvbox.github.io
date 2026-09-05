/** App-wide magic numbers/strings that would otherwise be repeated (or
 * silently drift out of sync) across unrelated files. */

/** localStorage keys, kept in one place so nothing collides or drifts. */
export const STORAGE_KEYS = {
  user: 'tvbox_user',
  theme: 'tvbox-theme',
  gate: 'tvbox_gate_ok',
} as const

export const TOAST_SECONDS = 8
export const NOTIFICATIONS_POLL_MS = 60_000
/** A seen notification is pruned this many days after seen_at, so the feed
 * never grows into a permanent scroll -- see lib/notifications.ts. */
export const NOTIFICATIONS_STALE_SEEN_DAYS = 1
export const SEARCH_DEBOUNCE_MS = 350
export const FILTER_DEBOUNCE_MS = 350

export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 20
export const USERNAME_PATTERN = new RegExp(`^[a-zA-Z0-9_]{${USERNAME_MIN_LENGTH},${USERNAME_MAX_LENGTH}}$`)
export const EMAIL_PATTERN = /^\S+@\S+\.\S+$/

/** Row count for a full-page loading skeleton (Members, Compare, History,
 * ProfileActivity) vs. a compact dropdown one (FollowListPanel, NotificationsBell). */
export const SKELETON_ROWS = 5
export const SKELETON_ROWS_COMPACT = 3
export const SKELETON_ROWS_WIDE = 6

/** TMDB poster width for small list-row thumbnails (diary/watchlist/compare
 * rows) -- distinct from the larger sizes used by full poster grids. */
export const POSTER_THUMB_SIZE = 'w185'

/** "Give me basically everything" fetch caps, paged past PostgREST's 1000-row
 * response cap by lib/pagination.ts -- comfortably above even a heavy
 * backfilled history (one real user has 10k+ episode_watched rows). The
 * larger cap is for pages pulling two users' full history at once (Compare)
 * or ranking a whole year of it (Recap). A user's true total can still
 * exceed these in principle; past that point stats should move to a
 * server-side aggregate (e.g. a Postgres view) rather than raising this
 * further and shipping more rows to the client on every page load. */
export const ACTIVITY_FETCH_LIMIT = 20_000
export const LARGE_ACTIVITY_FETCH_LIMIT = 50_000

/** Same idea as ACTIVITY_FETCH_LIMIT, but for the group-wide Activity feed
 * (every user's recent rows, not just one). Watched episodes get a higher
 * cap -- there are far more of them per show than ratings or follows. */
export const GROUP_ACTIVITY_FETCH_LIMIT = 500
export const GROUP_ACTIVITY_WATCHED_FETCH_LIMIT = 1500

/** Supabase's hosted PostgREST caps every response at `db-max-rows` (1000
 * by default) regardless of a query's own .limit() -- silently truncating
 * results for any table that grows past that for one user. See
 * lib/pagination.ts, which pages requests of this size to work around it. */
export const POSTGREST_MAX_ROWS_PER_REQUEST = 1000

/** The one Supabase table name referenced from outside its own lib file. */
export const TABLE_USERS = 'users'

/** Query string for linking straight to Profile's Lists tab (ProfileActivity
 * owns the 'lists' tab value; Home and ListDetail just link to it). */
export const PROFILE_LISTS_TAB_QUERY = 'tab=lists'

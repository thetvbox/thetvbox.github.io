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

/** "Give me basically everything" fetch caps -- no real pagination exists
 * yet, so these just need to be comfortably above any one user's activity.
 * The larger cap is for pages pulling two users' full history at once
 * (Compare) or ranking a whole year of it (Recap). */
export const ACTIVITY_FETCH_LIMIT = 2000
export const LARGE_ACTIVITY_FETCH_LIMIT = 5000

/** Same idea as ACTIVITY_FETCH_LIMIT, but for the group-wide Activity feed
 * (every user's recent rows, not just one). Watched episodes get a higher
 * cap -- there are far more of them per show than ratings or follows. */
export const GROUP_ACTIVITY_FETCH_LIMIT = 500
export const GROUP_ACTIVITY_WATCHED_FETCH_LIMIT = 1500

/** The one Supabase table name referenced from outside its own lib file. */
export const TABLE_USERS = 'users'

/** Query string for linking straight to Profile's Lists tab (ProfileActivity
 * owns the 'lists' tab value; Home and ListDetail just link to it). */
export const PROFILE_LISTS_TAB_QUERY = 'tab=lists'

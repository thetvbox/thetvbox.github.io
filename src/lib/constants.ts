export const STORAGE_KEYS = {
  user: 'tvbox_user',
  theme: 'tvbox-theme',
  gate: 'tvbox_gate_ok',
} as const

export const MS_PER_DAY = 86_400_000

export const MAX_RATING = 5
export const RATING_STEP = 0.5
export const MAX_RATING_DIFF = MAX_RATING - RATING_STEP

export const TOAST_SECONDS = 8
export const NOTIFICATIONS_POLL_MS = 60_000
export const NOTIFICATIONS_STALE_SEEN_DAYS = 1
export const NOTIFICATION_FETCH_LIMIT = 30
export const SEARCH_DEBOUNCE_MS = 350
export const FILTER_DEBOUNCE_MS = 350

export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 20
export const USERNAME_PATTERN = new RegExp(`^[a-zA-Z0-9_]{${USERNAME_MIN_LENGTH},${USERNAME_MAX_LENGTH}}$`)
export const EMAIL_PATTERN = /^\S+@\S+\.\S+$/

export const SKELETON_ROWS = 5
export const SKELETON_ROWS_COMPACT = 3
export const SKELETON_ROWS_WIDE = 6

/** Diary tab renders entries in batches of this size, "Show more" reveals the next batch --
 *  a heavy watcher's full history can run into the thousands of rows, and rendering all of
 *  them as live (animated, image-bearing) DOM nodes at once would make the tab slow to open. */
export const DIARY_PAGE_SIZE = 40

export const POSTER_THUMB_SIZE = 'w185'

export const ACTIVITY_FETCH_LIMIT = 20_000
export const LARGE_ACTIVITY_FETCH_LIMIT = 50_000

export const GROUP_ACTIVITY_FETCH_LIMIT = 500
export const GROUP_ACTIVITY_WATCHED_FETCH_LIMIT = 1500

export const POSTGREST_MAX_ROWS_PER_REQUEST = 1000

export const TABLE_USERS = 'users'
export const TABLE_EPISODE_WATCHED = 'episode_watched'
export const TABLE_EPISODE_WATCHED_SHOW_SUMMARY = 'episode_watched_show_summary'
export const TABLE_EPISODE_WATCHED_UNDATED_SUMMARY = 'episode_watched_undated_summary'
export const TABLE_SHOW_RATINGS = 'show_ratings'
export const TABLE_SEASON_RATINGS = 'season_ratings'
export const TABLE_SHOW_STARTED = 'show_started'
export const TABLE_SHOW_WATCHING_DISMISSED = 'show_watching_dismissed'
export const TABLE_SHOW_DROPPED = 'show_dropped'
export const TABLE_SHOW_REWATCHES = 'show_rewatches'
export const TABLE_WATCHLIST = 'watchlist'
export const TABLE_SHOW_LISTS = 'show_lists'
export const TABLE_SHOW_LIST_ITEMS = 'show_list_items'
export const TABLE_SHOW_STREAMING_OVERRIDES = 'show_streaming_overrides'
export const TABLE_FOLLOWS = 'follows'
export const TABLE_NOTIFICATIONS = 'notifications'

export const BUG_REPORT_TITLE_MAX_LENGTH = 200
export const BUG_REPORT_DESCRIPTION_MAX_LENGTH = 4000
export const PASSCODE_LENGTH = 6

export const PROFILE_LISTS_TAB_QUERY = 'tab=lists'

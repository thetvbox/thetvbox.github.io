export const STORAGE_KEYS = {
  user: 'tvbox_user',
  theme: 'tvbox-theme',
  gate: 'tvbox_gate_ok',
} as const

export const TOAST_SECONDS = 8
export const NOTIFICATIONS_POLL_MS = 60_000
export const NOTIFICATIONS_STALE_SEEN_DAYS = 1
export const SEARCH_DEBOUNCE_MS = 350
export const FILTER_DEBOUNCE_MS = 350

export const USERNAME_MIN_LENGTH = 3
export const USERNAME_MAX_LENGTH = 20
export const USERNAME_PATTERN = new RegExp(`^[a-zA-Z0-9_]{${USERNAME_MIN_LENGTH},${USERNAME_MAX_LENGTH}}$`)
export const EMAIL_PATTERN = /^\S+@\S+\.\S+$/

export const SKELETON_ROWS = 5
export const SKELETON_ROWS_COMPACT = 3
export const SKELETON_ROWS_WIDE = 6

export const POSTER_THUMB_SIZE = 'w185'

export const ACTIVITY_FETCH_LIMIT = 20_000
export const LARGE_ACTIVITY_FETCH_LIMIT = 50_000

export const GROUP_ACTIVITY_FETCH_LIMIT = 500
export const GROUP_ACTIVITY_WATCHED_FETCH_LIMIT = 1500

export const POSTGREST_MAX_ROWS_PER_REQUEST = 1000

export const TABLE_USERS = 'users'

export const PROFILE_LISTS_TAB_QUERY = 'tab=lists'

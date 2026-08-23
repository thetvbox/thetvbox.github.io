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

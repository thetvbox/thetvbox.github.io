import { MS_PER_DAY } from './constants'

/** Returns a local calendar-day key (YYYY-MM-DD), independent of time-of-day. */
export function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/** Formats a date as "Today" / "Yesterday" / "Wednesday, June 3" (with year if not this year). */
export function formatDiaryHeading(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((startOf(now) - startOf(date)) / MS_PER_DAY)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

/** Formats a compact "Aug 12" date, parsing date-only strings as a local calendar day. */
export function formatShortDate(iso: string): string {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso)
  const date = dateOnly
    ? (() => {
        const [y, m, d] = iso.split('-').map(Number)
        return new Date(y, m - 1, d)
      })()
    : new Date(iso)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Returns today as a local YYYY-MM-DD string for `<input type="date">`. */
export function todayLocalDateInput(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Converts a `<input type="date">` value to an ISO timestamp anchored at local noon. */
export function dateInputToNoonIso(dateInput: string): string {
  return new Date(`${dateInput}T12:00:00`).toISOString()
}

/** True if a TMDB date-only string is still ahead of today, by the viewer's local calendar day. */
export function isFutureDate(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return false
  const target = new Date(y, m - 1, d).getTime()
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return target > startOfToday
}

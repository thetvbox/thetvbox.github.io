/** Local calendar-day key (YYYY-MM-DD), independent of time-of-day, for grouping. */
export function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/** "Today" / "Yesterday" / "Wednesday, June 3" (adds the year if not this year). */
export function formatDiaryHeading(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((startOf(now) - startOf(date)) / 86_400_000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

/** Compact "Aug 12" for list rows. Handles both full ISO timestamps and
 * TMDB's date-only "YYYY-MM-DD" (parsed as a local calendar day, not UTC,
 * or it rolls back a day west of UTC). */
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

/** Today as a local YYYY-MM-DD string for `<input type="date">`. Not
 * `toISOString().slice(0, 10)` -- that's the UTC date, a different calendar
 * day from local "today" for much of the day depending on timezone. */
export function todayLocalDateInput(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Converts a `<input type="date">` value to an ISO timestamp anchored at
 * local noon, not midnight -- avoids UTC conversion rolling it back a
 * calendar day west of UTC. */
export function dateInputToNoonIso(dateInput: string): string {
  return new Date(`${dateInput}T12:00:00`).toISOString()
}

/** Whether a TMDB date-only string is still ahead of today, by the viewer's
 * local calendar day -- not `new Date(dateStr) > new Date()`, which compares
 * against UTC midnight and flips episodes to "aired" hours early west of UTC. */
export function isFutureDate(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return false
  const target = new Date(y, m - 1, d).getTime()
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return target > startOfToday
}

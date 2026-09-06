import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  dateInputToNoonIso,
  dayKey,
  formatDiaryHeading,
  formatShortDate,
  isFutureDate,
  todayLocalDateInput,
} from './date'

describe('dayKey', () => {
  it('returns a Y-M-D key independent of time-of-day', () => {
    expect(dayKey('2026-06-03T23:59:00')).toBe(dayKey('2026-06-03T00:00:01'))
  })

  it('differs across a calendar-day boundary', () => {
    expect(dayKey('2026-06-03T23:59:59')).not.toBe(dayKey('2026-06-04T00:00:00'))
  })
})

describe('formatDiaryHeading', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "Today" for the current calendar day', () => {
    expect(formatDiaryHeading(new Date(2026, 5, 15, 3, 0, 0).toISOString())).toBe('Today')
  })

  it('returns "Yesterday" for one calendar day back', () => {
    expect(formatDiaryHeading(new Date(2026, 5, 14, 23, 0, 0).toISOString())).toBe('Yesterday')
  })

  it('omits the year for dates within the current year', () => {
    const heading = formatDiaryHeading(new Date(2026, 0, 3).toISOString())
    expect(heading).not.toMatch(/2026/)
  })

  it('includes the year for dates in a different year', () => {
    const heading = formatDiaryHeading(new Date(2025, 0, 3).toISOString())
    expect(heading).toMatch(/2025/)
  })
})

describe('formatShortDate', () => {
  it('parses a date-only string as a local calendar day, not UTC', () => {
    const formatted = formatShortDate('2026-01-01')
    expect(formatted).toMatch(/Jan/)
    expect(formatted).toMatch(/1/)
  })

  it('formats a full ISO timestamp', () => {
    expect(formatShortDate('2026-08-12T10:00:00Z')).toMatch(/Aug/)
  })
})

describe('todayLocalDateInput', () => {
  it('returns YYYY-MM-DD for the current local date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 6, 10, 0, 0))
    expect(todayLocalDateInput()).toBe('2026-09-06')
    vi.useRealTimers()
  })

  it('zero-pads single-digit months and days', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 5, 10, 0, 0))
    expect(todayLocalDateInput()).toBe('2026-01-05')
    vi.useRealTimers()
  })
})

describe('dateInputToNoonIso', () => {
  it('anchors the given date at local noon', () => {
    const iso = dateInputToNoonIso('2026-03-10')
    const parsed = new Date(iso)
    expect(parsed.getHours()).toBe(12)
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(2)
    expect(parsed.getDate()).toBe(10)
  })
})

describe('isFutureDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true for a date after today', () => {
    expect(isFutureDate('2026-06-16')).toBe(true)
  })

  it('returns false for today', () => {
    expect(isFutureDate('2026-06-15')).toBe(false)
  })

  it('returns false for a date before today', () => {
    expect(isFutureDate('2026-06-14')).toBe(false)
  })

  it('returns false for a malformed date string', () => {
    expect(isFutureDate('')).toBe(false)
    expect(isFutureDate('not-a-date')).toBe(false)
  })
})

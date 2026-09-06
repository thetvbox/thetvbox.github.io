import { describe, expect, it } from 'vitest'
import { errorMessage, pluralSuffix } from './format'

describe('pluralSuffix', () => {
  it('returns empty string for exactly 1', () => {
    expect(pluralSuffix(1)).toBe('')
  })

  it('returns "s" for 0', () => {
    expect(pluralSuffix(0)).toBe('s')
  })

  it('returns "s" for counts greater than 1', () => {
    expect(pluralSuffix(2)).toBe('s')
    expect(pluralSuffix(100)).toBe('s')
  })

  it('returns "s" for negative counts', () => {
    expect(pluralSuffix(-1)).toBe('s')
  })

  it('returns "s" for undefined (optional counts default to plural)', () => {
    expect(pluralSuffix(undefined)).toBe('s')
  })
})

describe('errorMessage', () => {
  it('uses the Error message when the thrown value is an Error', () => {
    expect(errorMessage(new Error('boom'), 'fallback')).toBe('boom')
  })

  it('uses the fallback for non-Error throws', () => {
    expect(errorMessage('a string', 'fallback')).toBe('fallback')
    expect(errorMessage(null, 'fallback')).toBe('fallback')
    expect(errorMessage(undefined, 'fallback')).toBe('fallback')
    expect(errorMessage({ code: 500 }, 'fallback')).toBe('fallback')
  })
})

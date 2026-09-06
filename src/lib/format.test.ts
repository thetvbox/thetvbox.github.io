import { describe, expect, it } from 'vitest'
import { pluralSuffix } from './format'

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

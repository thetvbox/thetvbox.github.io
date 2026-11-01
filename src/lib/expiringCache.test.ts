import { describe, expect, it } from 'vitest'
import { ExpiringCache } from './expiringCache'

describe('ExpiringCache', () => {
  it('returns a stored value until it expires, then forgets it', () => {
    let now = 1_000
    const cache = new ExpiringCache<string, number>(100, () => now)
    cache.set('a', 1)
    now = 1_099
    expect(cache.get('a')).toBe(1)
    now = 1_100
    expect(cache.get('a')).toBeUndefined()
    now = 1_000
    expect(cache.get('a')).toBeUndefined()
  })

  it('returns undefined for a key it never stored', () => {
    expect(new ExpiringCache<string, number>(100).get('missing')).toBeUndefined()
  })

  it('restarts the clock when a key is stored again', () => {
    let now = 0
    const cache = new ExpiringCache<string, number>(100, () => now)
    cache.set('a', 1)
    now = 90
    cache.set('a', 2)
    now = 150
    expect(cache.get('a')).toBe(2)
  })
})

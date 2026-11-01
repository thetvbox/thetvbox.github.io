import { describe, expect, it, vi } from 'vitest'
import { ExpiringCache, getOrLoad } from './expiringCache'

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

  it('forgets a deleted key', () => {
    const cache = new ExpiringCache<string, number>(100)
    cache.set('a', 1)
    cache.delete('a')
    expect(cache.get('a')).toBeUndefined()
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

describe('getOrLoad', () => {
  it('shares one in-flight load between concurrent callers', async () => {
    const cache = new ExpiringCache<string, Promise<number>>(100)
    const load = vi.fn(async () => 7)
    const [a, b] = await Promise.all([getOrLoad(cache, 'k', load), getOrLoad(cache, 'k', load)])
    expect([a, b]).toEqual([7, 7])
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('drops a failed load so the next call tries again', async () => {
    const cache = new ExpiringCache<string, Promise<number>>(100)
    await expect(getOrLoad(cache, 'k', () => Promise.reject(new Error('offline')))).rejects.toThrow('offline')
    expect(await getOrLoad(cache, 'k', async () => 3)).toBe(3)
  })

  it("doesn't drop a newer entry when an older load fails", async () => {
    const cache = new ExpiringCache<string, Promise<number>>(100)
    let fail: (err: Error) => void = () => {}
    const older = getOrLoad(cache, 'k', () => new Promise<number>((_, reject) => (fail = reject)))
    const newer = Promise.resolve(9)
    cache.set('k', newer)
    fail(new Error('late'))
    await expect(older).rejects.toThrow('late')
    expect(cache.get('k')).toBe(newer)
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { prefersReducedMotion, scrollBehavior, staggerDelay, staggerRowMotion, staggerTileMotion } from './motion'

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches } as MediaQueryList),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('prefersReducedMotion', () => {
  it('returns true when the OS-level reduce-motion query matches', () => {
    stubMatchMedia(true)
    expect(prefersReducedMotion()).toBe(true)
  })

  it('returns false when it does not match', () => {
    stubMatchMedia(false)
    expect(prefersReducedMotion()).toBe(false)
  })

  it('returns false (not a throw) when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(prefersReducedMotion()).toBe(false)
  })
})

describe('scrollBehavior', () => {
  it('returns "auto" when reduced motion is requested', () => {
    stubMatchMedia(true)
    expect(scrollBehavior()).toBe('auto')
  })

  it('returns "smooth" otherwise', () => {
    stubMatchMedia(false)
    expect(scrollBehavior()).toBe('smooth')
  })
})

describe('staggerDelay', () => {
  it('scales linearly with index below the cap', () => {
    expect(staggerDelay(0)).toBe(0)
    expect(staggerDelay(3)).toBeCloseTo(0.06)
  })

  it('caps the delay for indexes past the cap, so long lists do not take forever to finish entering', () => {
    expect(staggerDelay(50, 10)).toBe(staggerDelay(10, 10))
    expect(staggerDelay(11, 10)).toBe(staggerDelay(10, 10))
  })

  it('respects a custom cap', () => {
    expect(staggerDelay(5, 3)).toBe(staggerDelay(3, 3))
  })
})

describe('staggerRowMotion', () => {
  it('increases the delay with index, capped, and always fades/rises from the same offset', () => {
    const first = staggerRowMotion(0)
    const third = staggerRowMotion(2)
    expect(first.initial).toEqual({ opacity: 0, y: 6 })
    expect(first.animate).toEqual({ opacity: 1, y: 0 })
    expect(third.transition.delay).toBeGreaterThan(first.transition.delay)
  })

  it('caps the delay past the given index cap', () => {
    const atCap = staggerRowMotion(10, 10)
    const overCap = staggerRowMotion(50, 10)
    expect(overCap.transition.delay).toBe(atCap.transition.delay)
  })
})

describe('staggerTileMotion', () => {
  it('increases the delay with index, capped, and always fades/rises from the same offset', () => {
    const first = staggerTileMotion(0)
    const third = staggerTileMotion(2)
    expect(first.initial).toEqual({ opacity: 0, y: 10 })
    expect(third.transition.delay).toBeGreaterThan(first.transition.delay)
  })

  it('caps the delay past the given index cap', () => {
    const atCap = staggerTileMotion(12, 12)
    const overCap = staggerTileMotion(50, 12)
    expect(overCap.transition.delay).toBe(atCap.transition.delay)
  })
})

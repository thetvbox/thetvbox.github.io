import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from './constants'

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
  vi.unstubAllEnvs()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('siteGate with no passcode configured', () => {
  it('isGateConfigured is false and checkPasscode always passes', async () => {
    vi.stubEnv('VITE_SITE_PASSCODE', '')
    const { isGateConfigured, checkPasscode } = await import('./siteGate')
    expect(isGateConfigured).toBe(false)
    expect(checkPasscode('anything')).toBe(true)
    expect(checkPasscode('')).toBe(true)
  })
})

describe('siteGate with a passcode configured', () => {
  it('isGateConfigured is true and checkPasscode requires an exact (trimmed) match', async () => {
    vi.stubEnv('VITE_SITE_PASSCODE', '123456')
    const { isGateConfigured, checkPasscode } = await import('./siteGate')
    expect(isGateConfigured).toBe(true)
    expect(checkPasscode('123456')).toBe(true)
    expect(checkPasscode(' 123456 ')).toBe(true)
    expect(checkPasscode('654321')).toBe(false)
  })
})

describe('hasPassedGate / markGatePassed', () => {
  it('is false before markGatePassed and true after', async () => {
    vi.stubEnv('VITE_SITE_PASSCODE', '123456')
    const { hasPassedGate, markGatePassed } = await import('./siteGate')
    expect(hasPassedGate()).toBe(false)
    markGatePassed()
    expect(hasPassedGate()).toBe(true)
    expect(localStorage.getItem(STORAGE_KEYS.gate)).toBe('1')
  })

  it('hasPassedGate returns false (not a throw) if localStorage access throws', async () => {
    const { hasPassedGate } = await import('./siteGate')
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })
    expect(hasPassedGate()).toBe(false)
    spy.mockRestore()
  })

  it('markGatePassed does not throw if localStorage access throws', async () => {
    const { markGatePassed } = await import('./siteGate')
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })
    expect(() => markGatePassed()).not.toThrow()
    spy.mockRestore()
  })
})

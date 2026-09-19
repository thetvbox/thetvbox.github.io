import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerServiceWorker } from './registerServiceWorker'

function stubServiceWorkerApi() {
  const register = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { ...navigator, serviceWorker: { register } })
  return { register }
}

describe('registerServiceWorker', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('is a safe no-op when the Service Worker API is unsupported', () => {
    expect(() => registerServiceWorker()).not.toThrow()
  })

  it('registers /sw.js once the page finishes loading', async () => {
    const { register } = stubServiceWorkerApi()
    registerServiceWorker()
    expect(register).not.toHaveBeenCalled()
    window.dispatchEvent(new Event('load'))
    expect(register).toHaveBeenCalledWith('/sw.js')
  })

  it('swallows a rejected registration without throwing', async () => {
    const register = vi.fn().mockRejectedValue(new Error('boom'))
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: { register } })
    registerServiceWorker()
    expect(() => window.dispatchEvent(new Event('load'))).not.toThrow()
    await Promise.resolve()
    await Promise.resolve()
  })
})

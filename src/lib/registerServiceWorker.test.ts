import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerServiceWorker } from './registerServiceWorker'

/** Replaces navigator.serviceWorker with a fake that records listeners and registrations. */
function stubServiceWorkerApi({ controller = null as unknown, register = vi.fn() } = {}) {
  const update = vi.fn().mockResolvedValue(undefined)
  register.mockResolvedValue({ update })
  const listeners: Record<string, () => void> = {}
  const serviceWorker = {
    controller,
    register,
    addEventListener: vi.fn((type: string, listener: () => void) => {
      listeners[type] = listener
    }),
  }
  vi.stubGlobal('navigator', { ...navigator, serviceWorker })
  return { register, update, listeners }
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

  it('checks for a newer worker whenever the app comes back to the foreground', async () => {
    const { update } = stubServiceWorkerApi()
    registerServiceWorker()
    window.dispatchEvent(new Event('load'))
    await Promise.resolve()
    await Promise.resolve()
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(update).toHaveBeenCalled()
  })

  it('reloads when a newer worker takes over a page that already had one', () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    const { listeners } = stubServiceWorkerApi({ controller: {} })
    registerServiceWorker()
    listeners.controllerchange()
    expect(reload).toHaveBeenCalled()
  })

  it('does not reload when the first worker takes over', () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    const { listeners } = stubServiceWorkerApi()
    registerServiceWorker()
    listeners.controllerchange()
    expect(reload).not.toHaveBeenCalled()
  })

  it('swallows a rejected registration without throwing', async () => {
    const register = vi.fn()
    stubServiceWorkerApi({ register })
    register.mockRejectedValue(new Error('boom'))
    registerServiceWorker()
    expect(() => window.dispatchEvent(new Event('load'))).not.toThrow()
    await Promise.resolve()
    await Promise.resolve()
  })
})

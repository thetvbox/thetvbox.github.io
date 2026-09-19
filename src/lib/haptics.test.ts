import { beforeEach, describe, expect, it, vi } from 'vitest'

async function loadHaptics() {
  return import('./haptics')
}

beforeEach(() => {
  vi.resetModules()
  document.body.innerHTML = ''
})

describe('triggerHaptic', () => {
  it('creates a hidden switch checkbox and clicks it without throwing', async () => {
    const { triggerHaptic } = await loadHaptics()
    expect(() => triggerHaptic()).not.toThrow()
    const input = document.querySelector('input[type="checkbox"]')
    expect(input).not.toBeNull()
    expect(input).toHaveAttribute('switch')
  })

  it('reuses the same element across calls rather than creating a new one each time', async () => {
    const { triggerHaptic } = await loadHaptics()
    triggerHaptic()
    triggerHaptic()
    expect(document.querySelectorAll('input[type="checkbox"]').length).toBe(1)
  })

  it('never throws even if creating the element fails', async () => {
    const { triggerHaptic } = await loadHaptics()
    const spy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {
      throw new Error('boom')
    })
    expect(() => triggerHaptic()).not.toThrow()
    spy.mockRestore()
  })

  it('is a safe no-op when there is no document', async () => {
    const { triggerHaptic } = await loadHaptics()
    vi.stubGlobal('document', undefined)
    expect(() => triggerHaptic()).not.toThrow()
    vi.unstubAllGlobals()
  })
})

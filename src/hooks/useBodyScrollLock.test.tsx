import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useBodyScrollLock } from './useBodyScrollLock'

function Locker() {
  useBodyScrollLock()
  return null
}

describe('useBodyScrollLock', () => {
  it('locks body scroll on mount and restores it on unmount', () => {
    const { unmount } = render(<Locker />)
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('keeps scroll locked while a second overlay is still mounted, restoring only after the last one unmounts', () => {
    const first = render(<Locker />)
    const second = render(<Locker />)
    expect(document.body.style.overflow).toBe('hidden')

    first.unmount()
    expect(document.body.style.overflow).toBe('hidden')

    second.unmount()
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('restores whatever overflow value was set before the first lock, not an empty string', () => {
    document.body.style.overflow = 'scroll'
    const { unmount } = render(<Locker />)
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('scroll')
    document.body.style.overflow = ''
  })
})

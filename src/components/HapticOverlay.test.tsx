import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import HapticOverlay from './HapticOverlay'

describe('HapticOverlay', () => {
  it('renders a hidden, full-coverage checkbox switch', () => {
    const { container } = render(
      <button type="button" className="relative">
        <HapticOverlay />
      </button>,
    )
    const input = container.querySelector('input[type="checkbox"]')
    expect(input).not.toBeNull()
    expect(input).toHaveAttribute('aria-hidden', 'true')
    expect(input).toHaveAttribute('tabIndex', '-1')
    expect(input).toHaveClass('absolute', 'inset-0')
  })

  it('sets the experimental `switch` attribute after mount, for the iOS haptic trick', () => {
    const { container } = render(<HapticOverlay />)
    expect(container.querySelector('input[type="checkbox"]')).toHaveAttribute('switch')
  })

  it('does not intercept the tap -- a click on it still bubbles to the parent handler', () => {
    const onClick = vi.fn()
    const { container } = render(
      <button type="button" className="relative" onClick={onClick}>
        <HapticOverlay />
      </button>,
    )
    fireEvent.click(container.querySelector('input[type="checkbox"]') as HTMLInputElement)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

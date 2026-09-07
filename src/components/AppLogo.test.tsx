import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AppLogo from './AppLogo'

describe('AppLogo', () => {
  it('defaults to a 32px square svg', () => {
    const { container } = render(<AppLogo />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '32')
    expect(svg).toHaveAttribute('height', '32')
  })

  it('accepts a custom size', () => {
    const { container } = render(<AppLogo size={48} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '48')
    expect(svg).toHaveAttribute('height', '48')
  })

  it('applies a custom className', () => {
    const { container } = render(<AppLogo className="shrink-0" />)
    expect(container.querySelector('svg')).toHaveClass('shrink-0')
  })
})

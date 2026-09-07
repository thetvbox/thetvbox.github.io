import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Spinner from './Spinner'

describe('Spinner', () => {
  it('renders an accessible loading status by default', () => {
    render(<Spinner />)
    const el = screen.getByRole('status', { name: 'Loading' })
    expect(el.className).toContain('animate-spin')
    expect(el.className).toContain('h-8 w-8')
  })

  it('applies the requested size and tone variants', () => {
    render(<Spinner size="xs" tone="current" className="ml-0.5" />)
    const el = screen.getByRole('status')
    expect(el.className).toContain('h-3 w-3')
    expect(el.className).toContain('border-current/30')
    expect(el.className).toContain('ml-0.5')
  })
})

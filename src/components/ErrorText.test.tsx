import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ErrorText from './ErrorText'

describe('ErrorText', () => {
  it('renders the message with role=alert so screen readers announce it', () => {
    render(<ErrorText>Something went wrong.</ErrorText>)
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong.')
  })

  it('merges caller className alongside the base danger styling', () => {
    render(<ErrorText className="mb-4 text-sm">Nope</ErrorText>)
    const el = screen.getByRole('alert')
    expect(el.className).toContain('text-danger')
    expect(el.className).toContain('mb-4')
  })
})

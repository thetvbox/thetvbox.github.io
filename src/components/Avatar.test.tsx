import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Avatar from './Avatar'

describe('Avatar', () => {
  it('renders the first two characters of the username, uppercased', () => {
    render(<Avatar username="tarun" />)
    expect(screen.getByText('TA')).toBeInTheDocument()
  })

  it('handles a single-character username', () => {
    render(<Avatar username="x" />)
    expect(screen.getByText('X')).toBeInTheDocument()
  })

  it('defaults to the md size class', () => {
    render(<Avatar username="bob" />)
    expect(screen.getByText('BO')).toHaveClass('h-10', 'w-10')
  })

  it('applies the requested size class', () => {
    render(<Avatar username="bob" size="lg" />)
    expect(screen.getByText('BO')).toHaveClass('h-12', 'w-12')
  })
})

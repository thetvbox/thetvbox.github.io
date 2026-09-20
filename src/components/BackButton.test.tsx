import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import BackButton from './BackButton'

describe('BackButton', () => {
  it('renders as a button and calls onClick when given onClick', () => {
    const onClick = vi.fn()
    render(<BackButton onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders as a link to `to` when given a route', () => {
    render(
      <MemoryRouter>
        <BackButton to="/members" label="Back to people" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Back to people' })).toHaveAttribute('href', '/members')
  })

  it('uses a custom label', () => {
    render(<BackButton onClick={vi.fn()} label="Your lists" />)
    expect(screen.getByRole('button', { name: 'Your lists' })).toBeInTheDocument()
  })

  it('renders the floating variant as an icon-only control with an accessible name', () => {
    const onClick = vi.fn()
    render(<BackButton onClick={onClick} variant="floating" label="Back" />)
    const button = screen.getByRole('button', { name: 'Back' })
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(button).toHaveAttribute('title', 'Back')
  })

  it('renders the floating variant as a link when given `to`', () => {
    render(
      <MemoryRouter>
        <BackButton to="/home" variant="floating" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/home')
  })
})

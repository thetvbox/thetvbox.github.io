import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import StatCard from './StatCard'

describe('StatCard', () => {
  it('renders the value and label', () => {
    render(<StatCard label="Finished" value={12} />)
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('Finished')).toBeInTheDocument()
  })

  it('renders as a plain, non-interactive card without onClick', () => {
    render(<StatCard label="Finished" value={12} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders as a clickable button when onClick is given, and calls it', () => {
    const onClick = vi.fn()
    render(<StatCard label="Finished" value={12} onClick={onClick} />)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

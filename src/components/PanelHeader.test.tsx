import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PanelHeader from './PanelHeader'

describe('PanelHeader', () => {
  it('renders the title and calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<PanelHeader title="Filters" onClose={onClose} />)
    expect(screen.getByText('Filters')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders optional actions alongside the close button', () => {
    render(<PanelHeader title="Notifications" onClose={vi.fn()} actions={<button type="button">Clear all</button>} />)
    expect(screen.getByRole('button', { name: 'Clear all' })).toBeInTheDocument()
  })

  it('renders no extra actions when none are given', () => {
    render(<PanelHeader title="Followers" onClose={vi.fn()} />)
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })
})

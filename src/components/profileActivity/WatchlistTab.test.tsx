import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)

import WatchlistTab from './WatchlistTab'
import type { WatchlistItem } from '../../types'

function item(overrides: Partial<WatchlistItem> = {}): WatchlistItem {
  return {
    id: 'w1',
    user_id: 'u1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    added_at: '2026-01-01T12:00:00Z',
    ...overrides,
  }
}

function renderTab(props: Partial<Parameters<typeof WatchlistTab>[0]> = {}) {
  return render(
    <MemoryRouter>
      <WatchlistTab items={[]} isMe onRemove={vi.fn()} {...props} />
    </MemoryRouter>,
  )
}

describe('WatchlistTab', () => {
  it('shows the owner empty state with a find-a-show link', () => {
    renderTab({ isMe: true })
    expect(screen.getByText(/Nothing on your watchlist yet/)).toBeInTheDocument()
    expect(screen.getByText('Find a show')).toBeInTheDocument()
  })

  it('shows a plain empty state for a visitor', () => {
    renderTab({ isMe: false })
    expect(screen.getByText(/Nothing here yet/)).toBeInTheDocument()
    expect(screen.queryByText('Find a show')).not.toBeInTheDocument()
  })

  it('renders one row per item', () => {
    renderTab({ items: [item({ show_name: 'Show One' }), item({ id: 'w2', show_name: 'Show Two' })] })
    expect(screen.getByText('Show One')).toBeInTheDocument()
    expect(screen.getByText('Show Two')).toBeInTheDocument()
  })

  it('shows a Remove button for the owner and calls onRemove', () => {
    const onRemove = vi.fn()
    const show = item()
    renderTab({ items: [show], isMe: true, onRemove })
    fireEvent.click(screen.getByText('Remove'))
    expect(onRemove).toHaveBeenCalledWith(show)
  })

  it('hides the Remove button for a visitor', () => {
    renderTab({ items: [item()], isMe: false })
    expect(screen.queryByText('Remove')).not.toBeInTheDocument()
  })
})

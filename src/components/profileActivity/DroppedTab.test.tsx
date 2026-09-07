import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)

import DroppedTab from './DroppedTab'
import type { ShowDropped } from '../../types'

function item(overrides: Partial<ShowDropped> = {}): ShowDropped {
  return {
    id: 'd1',
    user_id: 'u1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    dropped_at: '2026-01-01T12:00:00Z',
    ...overrides,
  }
}

function renderTab(props: Partial<Parameters<typeof DroppedTab>[0]> = {}) {
  return render(
    <MemoryRouter>
      <DroppedTab items={[]} isMe onResume={vi.fn()} {...props} />
    </MemoryRouter>,
  )
}

describe('DroppedTab', () => {
  it('shows the owner empty state', () => {
    renderTab({ isMe: true })
    expect(screen.getByText(/Nothing dropped/)).toBeInTheDocument()
  })

  it('shows a plain empty state for a visitor', () => {
    renderTab({ isMe: false })
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument()
  })

  it('renders dropped shows with their dropped date', () => {
    renderTab({ items: [item({ show_name: 'Show One', dropped_at: '2026-03-01T12:00:00Z' })] })
    expect(screen.getByText('Show One')).toBeInTheDocument()
    expect(screen.getByText(/Dropped/)).toBeInTheDocument()
  })

  it('shows a Resume button for the owner and calls onResume', () => {
    const onResume = vi.fn()
    const show = item()
    renderTab({ items: [show], isMe: true, onResume })
    fireEvent.click(screen.getByText('Resume'))
    expect(onResume).toHaveBeenCalledWith(show)
  })

  it('hides the Resume button for a visitor', () => {
    renderTab({ items: [item()], isMe: false })
    expect(screen.queryByText('Resume')).not.toBeInTheDocument()
  })
})

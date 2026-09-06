import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)

import ShowDetailQuickActions from './ShowDetailQuickActions'
import type { TmdbShowDetail } from '../../types'

function show(overrides: Partial<TmdbShowDetail> = {}): TmdbShowDetail {
  return {
    id: 1,
    name: 'Show One',
    overview: '',
    poster_path: null,
    backdrop_path: null,
    first_air_date: '2020-01-01',
    genres: [],
    number_of_seasons: 1,
    number_of_episodes: 10,
    status: 'Ended',
    origin_country: ['US'],
    original_language: 'en',
    seasons: [],
    ...overrides,
  }
}

const baseProps = {
  show: show(),
  user: null,
  canTrackNowWatching: true,
  inNowWatching: false,
  dismissedItem: null,
  savingNowWatching: false,
  onToggleNowWatching: vi.fn(),
  canDropShow: false,
  droppedItem: null,
  savingDropped: false,
  onToggleDropped: vi.fn(),
  watchlistItem: null,
  savingWatchlist: false,
  onToggleWatchlist: vi.fn(),
  listMembership: new Set<string>(),
  onListMembershipChange: vi.fn(),
  listPickerOpen: false,
  onToggleListPicker: vi.fn(),
  onCloseListPicker: vi.fn(),
}

describe('ShowDetailQuickActions', () => {
  it('shows "Start watching" when not started and not dismissed', () => {
    render(<ShowDetailQuickActions {...baseProps} />)
    expect(screen.getByText('Start watching')).toBeInTheDocument()
  })

  it('shows "Add to Now Watching" when previously dismissed', () => {
    render(
      <ShowDetailQuickActions
        {...baseProps}
        dismissedItem={{ id: 'd1', user_id: 'u1', show_id: 1, dismissed_at: '2026-01-01T00:00:00Z' }}
      />,
    )
    expect(screen.getByText('Add to Now Watching')).toBeInTheDocument()
  })

  it('shows "Remove from Now Watching" and aria-pressed=true when already in progress', () => {
    render(<ShowDetailQuickActions {...baseProps} inNowWatching />)
    const button = screen.getByText('Remove from Now Watching').closest('button')!
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('omits the Now Watching pill entirely when canTrackNowWatching is false', () => {
    render(<ShowDetailQuickActions {...baseProps} canTrackNowWatching={false} />)
    expect(screen.queryByText('Start watching')).not.toBeInTheDocument()
  })

  it('calls onToggleNowWatching when the pill is clicked', () => {
    const onToggleNowWatching = vi.fn()
    render(<ShowDetailQuickActions {...baseProps} onToggleNowWatching={onToggleNowWatching} />)
    fireEvent.click(screen.getByText('Start watching'))
    expect(onToggleNowWatching).toHaveBeenCalledTimes(1)
  })

  it('disables the Now Watching pill while saving', () => {
    render(<ShowDetailQuickActions {...baseProps} savingNowWatching />)
    expect(screen.getByText('Start watching').closest('button')).toBeDisabled()
  })

  it('omits the Drop pill when canDropShow is false', () => {
    render(<ShowDetailQuickActions {...baseProps} canDropShow={false} />)
    expect(screen.queryByText('Drop this show')).not.toBeInTheDocument()
  })

  it('shows "Drop this show" when droppable and not dropped', () => {
    render(<ShowDetailQuickActions {...baseProps} canDropShow />)
    expect(screen.getByText('Drop this show')).toBeInTheDocument()
  })

  it('shows "Resume watching" when dropped', () => {
    render(
      <ShowDetailQuickActions
        {...baseProps}
        canDropShow
        droppedItem={{ id: 'd1', user_id: 'u1', show_id: 1, show_name: 'Show One', show_poster_path: null, dropped_at: '2026-01-01T00:00:00Z' }}
      />,
    )
    const button = screen.getByText('Resume watching').closest('button')!
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows "Add to watchlist" / "On your watchlist" based on watchlistItem', () => {
    const { rerender } = render(<ShowDetailQuickActions {...baseProps} />)
    expect(screen.getByText('Add to watchlist')).toBeInTheDocument()

    rerender(
      <ShowDetailQuickActions
        {...baseProps}
        watchlistItem={{ id: 'w1', user_id: 'u1', show_id: 1, show_name: 'Show One', show_poster_path: null, added_at: '2026-01-01T00:00:00Z' }}
      />,
    )
    expect(screen.getByText('On your watchlist')).toBeInTheDocument()
  })

  it('calls onToggleWatchlist when clicked', () => {
    const onToggleWatchlist = vi.fn()
    render(<ShowDetailQuickActions {...baseProps} onToggleWatchlist={onToggleWatchlist} />)
    fireEvent.click(screen.getByText('Add to watchlist'))
    expect(onToggleWatchlist).toHaveBeenCalledTimes(1)
  })

  it('shows "Add to a list" when membership is empty', () => {
    render(<ShowDetailQuickActions {...baseProps} />)
    expect(screen.getByText('Add to a list')).toBeInTheDocument()
  })

  it('pluralizes the list count correctly for one vs. many lists', () => {
    const { rerender } = render(<ShowDetailQuickActions {...baseProps} listMembership={new Set(['l1'])} />)
    expect(screen.getByText('On 1 list')).toBeInTheDocument()

    rerender(<ShowDetailQuickActions {...baseProps} listMembership={new Set(['l1', 'l2'])} />)
    expect(screen.getByText('On 2 lists')).toBeInTheDocument()
  })

  it('calls onToggleListPicker when the list pill is clicked', () => {
    const onToggleListPicker = vi.fn()
    render(<ShowDetailQuickActions {...baseProps} onToggleListPicker={onToggleListPicker} />)
    fireEvent.click(screen.getByText('Add to a list'))
    expect(onToggleListPicker).toHaveBeenCalledTimes(1)
  })

  it('does not render the list picker panel when listPickerOpen is false', () => {
    render(<ShowDetailQuickActions {...baseProps} listPickerOpen={false} />)
    expect(screen.queryByPlaceholderText(/list name/i)).not.toBeInTheDocument()
  })
})

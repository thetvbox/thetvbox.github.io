import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('./HistorySection', () => ({
  default: ({ activity, emptyMessage }: { activity: unknown[]; emptyMessage: string }) => (
    <div data-testid="history-section">{activity.length > 0 ? `history:${activity.length}` : emptyMessage}</div>
  ),
}))
vi.mock('../lib/showRatings', () => ({ fetchRecentShowRatings: vi.fn() }))
vi.mock('../lib/watched', () => ({ fetchRecentDatedWatched: vi.fn() }))
vi.mock('../lib/rewatches', () => ({ fetchRecentRewatches: vi.fn() }))
vi.mock('../lib/showWatchSummary', () => ({ fetchShowWatchSummary: vi.fn(), fetchUndatedShowWatchSummary: vi.fn() }))
vi.mock('../lib/watchlist', () => ({ addToWatchlist: vi.fn(), fetchWatchlist: vi.fn(), removeFromWatchlist: vi.fn() }))
vi.mock('../lib/showDropped', () => ({ dropShow: vi.fn(), fetchDroppedForUser: vi.fn(), undropShow: vi.fn() }))
vi.mock('../lib/lists', () => ({ createList: vi.fn(), fetchListsForUser: vi.fn() }))

import { useAuth } from '../contexts/AuthContext'
import { fetchRecentShowRatings } from '../lib/showRatings'
import { fetchRecentDatedWatched } from '../lib/watched'
import { fetchRecentRewatches } from '../lib/rewatches'
import { fetchShowWatchSummary, fetchUndatedShowWatchSummary } from '../lib/showWatchSummary'
import { addToWatchlist, fetchWatchlist, removeFromWatchlist } from '../lib/watchlist'
import { dropShow, fetchDroppedForUser, undropShow } from '../lib/showDropped'
import { createList, fetchListsForUser } from '../lib/lists'
import ProfileActivity from './ProfileActivity'
import type { AppUser, ShowDropped, ShowListWithCount, ShowRating, WatchlistItem } from '../types'

const me: AppUser = { id: 'u1', email: 'me@example.com', username: 'me', created_at: '2026-01-01T00:00:00Z' }

function rating(overrides: Partial<ShowRating> = {}): ShowRating {
  return {
    id: 'r1',
    user_id: 'u1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    rating: 4,
    rated_at: '2026-01-01T12:00:00Z',
    ...overrides,
  }
}

function watchlistItem(overrides: Partial<WatchlistItem> = {}): WatchlistItem {
  return {
    id: 'w1',
    user_id: 'u1',
    show_id: 1,
    show_name: 'Watch This',
    show_poster_path: null,
    added_at: '2026-01-01T12:00:00Z',
    ...overrides,
  }
}

function droppedItem(overrides: Partial<ShowDropped> = {}): ShowDropped {
  return {
    id: 'd1',
    user_id: 'u1',
    show_id: 1,
    show_name: 'Dropped Show',
    show_poster_path: null,
    dropped_at: '2026-01-01T12:00:00Z',
    ...overrides,
  }
}

function listRow(overrides: Partial<ShowListWithCount> = {}): ShowListWithCount {
  return {
    id: 'l1',
    user_id: 'u1',
    name: 'Favorites',
    description: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    itemCount: 0,
    ...overrides,
  }
}

function renderActivity(userId = 'u1') {
  return render(
    <MemoryRouter>
      <ProfileActivity userId={userId} username="bob" />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(fetchRecentShowRatings).mockReset().mockResolvedValue([])
  vi.mocked(fetchRecentDatedWatched).mockReset().mockResolvedValue([])
  vi.mocked(fetchShowWatchSummary).mockReset().mockResolvedValue([])
  vi.mocked(fetchUndatedShowWatchSummary).mockReset().mockResolvedValue([])
  vi.mocked(fetchRecentRewatches).mockReset().mockResolvedValue([])
  vi.mocked(fetchWatchlist).mockReset().mockResolvedValue([])
  vi.mocked(fetchDroppedForUser).mockReset().mockResolvedValue([])
  vi.mocked(fetchListsForUser).mockReset().mockResolvedValue([])
  vi.mocked(addToWatchlist).mockReset()
  vi.mocked(removeFromWatchlist).mockReset().mockResolvedValue(undefined)
  vi.mocked(dropShow).mockReset()
  vi.mocked(undropShow).mockReset().mockResolvedValue(undefined)
  vi.mocked(createList).mockReset()
  vi.mocked(useAuth).mockReturnValue({
    user: me,
    loading: false,
    findByEmail: vi.fn(),
    register: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })
})

describe('ProfileActivity', () => {
  it('shows a loading skeleton before data resolves', () => {
    vi.mocked(fetchRecentShowRatings).mockReturnValue(new Promise(() => {}))
    const { container } = renderActivity()
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('shows stat cards computed from the fetched data', async () => {
    vi.mocked(fetchRecentShowRatings).mockResolvedValue([rating({ rating: 4 }), rating({ id: 'r2', rating: 2 })])
    renderActivity()
    await waitFor(() => expect(screen.getByText('Shows rated')).toBeInTheDocument())
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3.0')).toBeInTheDocument()
  })

  it('shows an error message when loading fails', async () => {
    vi.mocked(fetchRecentShowRatings).mockRejectedValue(new Error('load failed'))
    renderActivity()
    await waitFor(() => expect(screen.getByText('load failed')).toBeInTheDocument())
  })

  it('defaults to the Diary tab', async () => {
    renderActivity()
    await waitFor(() => expect(screen.getByText('Diary').closest('button')).toHaveAttribute('aria-pressed', 'true'))
  })

  it('switches to the Watchlist tab and renders watchlist items', async () => {
    vi.mocked(fetchWatchlist).mockResolvedValue([watchlistItem({ show_name: 'Watch This' })])
    renderActivity()
    await waitFor(() => expect(screen.getByText('Watchlist')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Watchlist'))
    expect(screen.getByText('Watch This')).toBeInTheDocument()
  })

  it('removes a watchlist item optimistically and offers undo', async () => {
    vi.mocked(fetchWatchlist).mockResolvedValue([watchlistItem({ show_name: 'Watch This' })])
    renderActivity()
    await waitFor(() => expect(screen.getByText('Watchlist')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Watchlist'))
    fireEvent.click(screen.getByText('Remove'))
    await waitFor(() => expect(screen.queryByText('Watch This')).not.toBeInTheDocument())
    expect(removeFromWatchlist).toHaveBeenCalledWith('u1', 1)
    expect(screen.getByText(/Removed Watch This from watchlist/)).toBeInTheDocument()
  })

  it('undoing a watchlist removal restores the item', async () => {
    vi.mocked(fetchWatchlist).mockResolvedValue([watchlistItem({ show_name: 'Watch This' })])
    vi.mocked(addToWatchlist).mockResolvedValue(watchlistItem({ show_name: 'Watch This' }))
    renderActivity()
    await waitFor(() => expect(screen.getByText('Watchlist')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Watchlist'))
    fireEvent.click(screen.getByText('Remove'))
    await waitFor(() => expect(screen.getByText('Undo')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Undo'))
    await waitFor(() => expect(screen.getByText('Watch This')).toBeInTheDocument())
  })

  it('switches to the Dropped tab and resumes a show', async () => {
    vi.mocked(fetchDroppedForUser).mockResolvedValue([droppedItem({ show_name: 'Dropped Show' })])
    renderActivity()
    await waitFor(() => expect(screen.getByText('Dropped')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Dropped'))
    fireEvent.click(screen.getByText('Resume'))
    await waitFor(() => expect(screen.queryByText('Dropped Show')).not.toBeInTheDocument())
    expect(undropShow).toHaveBeenCalledWith('u1', 1)
  })

  it('switches to the Lists tab and creates a new list', async () => {
    vi.mocked(createList).mockResolvedValue(listRow({ id: 'l2', name: 'New List' }))
    renderActivity()
    await waitFor(() => expect(screen.getByText('Lists')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Lists'))
    fireEvent.click(screen.getByText('New list'))
    fireEvent.change(screen.getByPlaceholderText('List name'), { target: { value: 'New List' } })
    fireEvent.click(screen.getByText('Create'))
    await waitFor(() => expect(screen.getByText('New List')).toBeInTheDocument())
    expect(createList).toHaveBeenCalledWith('u1', 'New List')
  })

  it('switches to the History tab', async () => {
    vi.mocked(fetchRecentShowRatings).mockResolvedValue([rating()])
    vi.mocked(fetchShowWatchSummary).mockResolvedValue([
      {
        user_id: 'u1',
        show_id: 1,
        show_name: 'Show One',
        show_poster_path: null,
        watched_count: 10,
        total_episodes: 10,
        last_watched_at: '2026-01-01T00:00:00Z',
        last_watched_at_unknown: false,
        runtime_minutes_sum: 400,
      },
    ])
    renderActivity()
    await waitFor(() => expect(screen.getByText('History')).toBeInTheDocument())
    fireEvent.click(screen.getByText('History'))
    expect(screen.getByTestId('history-section')).toHaveTextContent('history:1')
  })

  it('hides owner-only controls for a visitor viewing someone else\'s profile', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { ...me, id: 'someone-else' },
      loading: false,
      findByEmail: vi.fn(),
      register: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    })
    vi.mocked(fetchWatchlist).mockResolvedValue([watchlistItem()])
    renderActivity('u1')
    await waitFor(() => expect(screen.getByText('Watchlist')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Watchlist'))
    expect(screen.queryByText('Remove')).not.toBeInTheDocument()
  })
})

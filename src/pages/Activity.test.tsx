import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../lib/showRatings', () => ({ fetchRecentShowRatingsAllUsers: vi.fn() }))
vi.mock('../lib/seasonRatings', () => ({ fetchRecentSeasonRatingsAllUsers: vi.fn() }))
vi.mock('../lib/watched', () => ({ fetchRecentWatchedAllUsers: vi.fn() }))
vi.mock('../lib/users', () => ({ fetchAllUsers: vi.fn() }))
vi.mock('../lib/follows', () => ({ fetchAllFollows: vi.fn(), fetchFollowingIds: vi.fn() }))
vi.mock('../components/ActivityRow', () => ({
  default: ({ event }: { event: { showName: string } }) => <div>Rated {event.showName}</div>,
}))
vi.mock('../components/FollowActivityRow', () => ({
  default: ({ event }: { event: { followedUsername: string } }) => <div>Followed {event.followedUsername}</div>,
}))

import { useAuth } from '../contexts/AuthContext'
import { fetchRecentShowRatingsAllUsers } from '../lib/showRatings'
import { fetchRecentSeasonRatingsAllUsers } from '../lib/seasonRatings'
import { fetchRecentWatchedAllUsers } from '../lib/watched'
import { fetchAllUsers } from '../lib/users'
import { fetchAllFollows, fetchFollowingIds } from '../lib/follows'
import Activity from './Activity'
import type { AppUser, Follow, ShowRatingWithUser } from '../types'

const me: AppUser = { id: 'u1', email: 'me@example.com', username: 'me', created_at: '2026-01-01T00:00:00Z' }
const friend: AppUser = { id: 'u2', email: 'friend@example.com', username: 'friend', created_at: '2026-01-01T00:00:00Z' }
const stranger: AppUser = { id: 'u3', email: 'stranger@example.com', username: 'stranger', created_at: '2026-01-01T00:00:00Z' }

function ratingFor(user: AppUser, overrides: Partial<ShowRatingWithUser> = {}): ShowRatingWithUser {
  return {
    id: `r-${user.id}`,
    user_id: user.id,
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    rating: 4.5,
    rated_at: '2026-01-01T00:00:00Z',
    users: { username: user.username },
    ...overrides,
  }
}

function renderActivity() {
  return render(
    <MemoryRouter>
      <Activity />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(fetchRecentShowRatingsAllUsers).mockReset().mockResolvedValue([])
  vi.mocked(fetchRecentSeasonRatingsAllUsers).mockReset().mockResolvedValue([])
  vi.mocked(fetchRecentWatchedAllUsers).mockReset().mockResolvedValue([])
  vi.mocked(fetchAllUsers).mockReset().mockResolvedValue([me, friend, stranger])
  vi.mocked(fetchAllFollows).mockReset().mockResolvedValue([])
  vi.mocked(fetchFollowingIds).mockReset().mockResolvedValue(new Set())
  vi.mocked(useAuth).mockReturnValue({
    user: me,
    loading: false,
    findByEmail: vi.fn(),
    register: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })
})

describe('Activity', () => {
  it('shows a loading skeleton before data resolves', () => {
    vi.mocked(fetchAllUsers).mockReturnValue(new Promise(() => {}))
    const { container } = renderActivity()
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('shows an error message when loading fails', async () => {
    vi.mocked(fetchAllUsers).mockRejectedValue(new Error('load failed'))
    renderActivity()
    await waitFor(() => expect(screen.getByText('load failed')).toBeInTheDocument())
  })

  it('auto-switches to Everyone scope when the user follows no one', async () => {
    renderActivity()
    await waitFor(() => expect(screen.getByText('Everyone').closest('button')).toHaveAttribute('aria-pressed', 'true'))
    expect(screen.getByText("Nobody's rated or finished a show yet. Be the first.")).toBeInTheDocument()
  })

  it('renders activity grouped under a day heading', async () => {
    vi.mocked(fetchRecentShowRatingsAllUsers).mockResolvedValue([ratingFor(friend)])
    renderActivity()
    await waitFor(() => expect(screen.getByText('Rated Show One')).toBeInTheDocument())
  })

  it('filters the feed to people you follow when Following is active', async () => {
    vi.mocked(fetchFollowingIds).mockResolvedValue(new Set(['u2']))
    vi.mocked(fetchRecentShowRatingsAllUsers).mockResolvedValue([
      ratingFor(friend, { id: 'r-friend' }),
      ratingFor(stranger, { id: 'r-stranger', show_id: 2, show_name: 'Show Two' }),
    ])
    renderActivity()
    await waitFor(() => expect(screen.getByText('Rated Show One')).toBeInTheDocument())
    expect(screen.queryByText('Rated Show Two')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Everyone'))
    await waitFor(() => expect(screen.getByText('Rated Show Two')).toBeInTheDocument())
  })

  it('does not show the Person trigger when at most one member has activity', async () => {
    vi.mocked(fetchFollowingIds).mockResolvedValue(new Set(['u2']))
    vi.mocked(fetchRecentShowRatingsAllUsers).mockResolvedValue([ratingFor(friend)])
    renderActivity()
    await waitFor(() => expect(screen.getByText('Rated Show One')).toBeInTheDocument())
    expect(screen.queryByText('Person')).not.toBeInTheDocument()
  })

  it('opens the person-filter panel from the trigger and filters by clicking someone', async () => {
    vi.mocked(fetchFollowingIds).mockResolvedValue(new Set(['u2', 'u3']))
    vi.mocked(fetchRecentShowRatingsAllUsers).mockResolvedValue([
      ratingFor(friend, { id: 'r-friend' }),
      ratingFor(stranger, { id: 'r-stranger', show_id: 2, show_name: 'Show Two' }),
    ])
    renderActivity()
    await waitFor(() => expect(screen.getByText('Person')).toBeInTheDocument())
    expect(screen.queryByText('@friend')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Person'))
    await waitFor(() => expect(screen.getByText('Filter by person')).toBeInTheDocument())
    fireEvent.click(screen.getByText('@friend'))

    // Panel closes and the trigger now shows who's selected.
    await waitFor(() => expect(screen.queryByText('Filter by person')).not.toBeInTheDocument())
    expect(screen.getByText('@friend')).toBeInTheDocument()
    expect(screen.getByText('Rated Show One')).toBeInTheDocument()
    expect(screen.queryByText('Rated Show Two')).not.toBeInTheDocument()
    expect(screen.getByText('What @friend has been up to.')).toBeInTheDocument()
  })

  it('clears the person filter (and closes the panel) if switching scope drops them from the pool', async () => {
    vi.mocked(fetchFollowingIds).mockResolvedValue(new Set(['u2']))
    vi.mocked(fetchRecentShowRatingsAllUsers).mockResolvedValue([
      ratingFor(friend, { id: 'r-friend' }),
      ratingFor(stranger, { id: 'r-stranger', show_id: 2, show_name: 'Show Two' }),
    ])
    renderActivity()
    // Following-only scope excludes stranger, so the person picker starts with just one
    // member (friend) -- switch to Everyone first to bring stranger into the pool.
    await waitFor(() => expect(screen.getByText('Rated Show One')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Everyone'))
    await waitFor(() => expect(screen.getByText('Person')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Person'))
    await waitFor(() => expect(screen.getByText('@stranger')).toBeInTheDocument())
    fireEvent.click(screen.getByText('@stranger'))
    await waitFor(() => expect(screen.getByText('Rated Show Two')).toBeInTheDocument())

    // Switching back to Following excludes stranger entirely -- the filter should reset
    // instead of showing a misleading "hasn't done anything" empty state for them.
    fireEvent.click(screen.getByText('Following'))
    await waitFor(() => expect(screen.getByText('Rated Show One')).toBeInTheDocument())
    expect(screen.queryByText('@stranger')).not.toBeInTheDocument()
  })

  it('picking "All" in the panel clears the person filter', async () => {
    vi.mocked(fetchFollowingIds).mockResolvedValue(new Set(['u2', 'u3']))
    vi.mocked(fetchRecentShowRatingsAllUsers).mockResolvedValue([
      ratingFor(friend, { id: 'r-friend' }),
      ratingFor(stranger, { id: 'r-stranger', show_id: 2, show_name: 'Show Two' }),
    ])
    renderActivity()
    await waitFor(() => expect(screen.getByText('Person')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Person'))
    await waitFor(() => expect(screen.getByText('@friend')).toBeInTheDocument())
    fireEvent.click(screen.getByText('@friend'))
    await waitFor(() => expect(screen.queryByText('Rated Show Two')).not.toBeInTheDocument())

    fireEvent.click(screen.getByText('@friend'))
    await waitFor(() => expect(screen.getByText('Filter by person')).toBeInTheDocument())
    fireEvent.click(screen.getByText('All'))
    await waitFor(() => expect(screen.getByText('Rated Show Two')).toBeInTheDocument())
    expect(screen.getByText('Rated Show One')).toBeInTheDocument()
  })

  it('renders follow events via FollowActivityRow', async () => {
    const follow: Follow = { id: 'f1', follower_id: 'u2', followed_id: 'u3', created_at: '2026-01-01T00:00:00Z' }
    vi.mocked(fetchFollowingIds).mockResolvedValue(new Set(['u2']))
    vi.mocked(fetchAllFollows).mockResolvedValue([follow])
    renderActivity()
    await waitFor(() => expect(screen.getByText('Followed stranger')).toBeInTheDocument())
  })
})

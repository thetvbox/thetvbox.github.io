import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../lib/showRatings', () => ({ fetchRecentShowRatingsAllUsers: vi.fn() }))
vi.mock('../lib/seasonRatings', () => ({ fetchRecentSeasonRatingsAllUsers: vi.fn() }))
vi.mock('../lib/watched', () => ({ fetchRecentWatchedAllUsers: vi.fn() }))
vi.mock('../lib/showStarted', () => ({ fetchStartedAllUsers: vi.fn() }))
vi.mock('../lib/showDismissed', () => ({ fetchDismissedAllUsers: vi.fn() }))
vi.mock('../lib/showDropped', () => ({ fetchDroppedAllUsers: vi.fn() }))
vi.mock('../lib/tmdb', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/tmdb')>()),
  getShowDetailsBulk: vi.fn(),
}))
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
import { fetchStartedAllUsers } from '../lib/showStarted'
import { fetchDismissedAllUsers } from '../lib/showDismissed'
import { fetchDroppedAllUsers } from '../lib/showDropped'
import { getShowDetailsBulk } from '../lib/tmdb'
import { fetchAllUsers } from '../lib/users'
import { fetchAllFollows, fetchFollowingIds } from '../lib/follows'
import { NOW_WATCHING_PREVIEW_LIMIT } from '../lib/constants'
import Activity from './Activity'
import type { AppUser, Follow, ShowRatingWithUser, ShowStartedWithUser, TmdbShowDetail } from '../types'

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

function startedFor(user: AppUser, overrides: Partial<ShowStartedWithUser> = {}): ShowStartedWithUser {
  return {
    id: `s-${user.id}`,
    user_id: user.id,
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    show_total_episodes: 10,
    started_at: '2026-01-01T00:00:00Z',
    users: { username: user.username },
    ...overrides,
  }
}

function showDetail(overrides: Partial<TmdbShowDetail> = {}): TmdbShowDetail {
  return {
    id: 1,
    name: 'Show One',
    overview: '',
    poster_path: null,
    backdrop_path: null,
    first_air_date: '2020-05-01',
    genres: [{ id: 1, name: 'Drama' }],
    number_of_seasons: 1,
    number_of_episodes: 10,
    status: 'Ended',
    origin_country: ['US'],
    original_language: 'en',
    seasons: [],
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
  vi.mocked(fetchStartedAllUsers).mockReset().mockResolvedValue([])
  vi.mocked(fetchDismissedAllUsers).mockReset().mockResolvedValue([])
  vi.mocked(fetchDroppedAllUsers).mockReset().mockResolvedValue([])
  vi.mocked(getShowDetailsBulk).mockReset().mockResolvedValue(new Map())
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

  it('does not show the Filter by person trigger when at most one member has activity', async () => {
    vi.mocked(fetchFollowingIds).mockResolvedValue(new Set(['u2']))
    vi.mocked(fetchRecentShowRatingsAllUsers).mockResolvedValue([ratingFor(friend)])
    renderActivity()
    await waitFor(() => expect(screen.getByText('Rated Show One')).toBeInTheDocument())
    expect(screen.queryByText('Filter by person')).not.toBeInTheDocument()
  })

  it('opens the person-filter dropdown from the trigger and filters by clicking someone', async () => {
    vi.mocked(fetchFollowingIds).mockResolvedValue(new Set(['u2', 'u3']))
    vi.mocked(fetchRecentShowRatingsAllUsers).mockResolvedValue([
      ratingFor(friend, { id: 'r-friend' }),
      ratingFor(stranger, { id: 'r-stranger', show_id: 2, show_name: 'Show Two' }),
    ])
    renderActivity()
    await waitFor(() => expect(screen.getByText('Filter by person')).toBeInTheDocument())
    expect(screen.queryByText('@friend')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Filter by person'))
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Filter by person' })).toBeInTheDocument())
    fireEvent.click(screen.getByText('@friend'))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('@friend')).toBeInTheDocument()
    expect(screen.getByText('Rated Show One')).toBeInTheDocument()
    expect(screen.queryByText('Rated Show Two')).not.toBeInTheDocument()
    expect(screen.getByText('What @friend has been up to.')).toBeInTheDocument()
  })

  it('clears the person filter (and closes the dropdown) if switching scope drops them from the pool', async () => {
    vi.mocked(fetchFollowingIds).mockResolvedValue(new Set(['u2']))
    vi.mocked(fetchRecentShowRatingsAllUsers).mockResolvedValue([
      ratingFor(friend, { id: 'r-friend' }),
      ratingFor(stranger, { id: 'r-stranger', show_id: 2, show_name: 'Show Two' }),
    ])
    renderActivity()
    await waitFor(() => expect(screen.getByText('Rated Show One')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Everyone'))
    await waitFor(() => expect(screen.getByText('Filter by person')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Filter by person'))
    await waitFor(() => expect(screen.getByText('@stranger')).toBeInTheDocument())
    fireEvent.click(screen.getByText('@stranger'))
    await waitFor(() => expect(screen.getByText('Rated Show Two')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Following'))
    await waitFor(() => expect(screen.getByText('Rated Show One')).toBeInTheDocument())
    expect(screen.queryByText('@stranger')).not.toBeInTheDocument()
  })

  it('clicking the already-selected person again clears the filter (no "All" option)', async () => {
    vi.mocked(fetchFollowingIds).mockResolvedValue(new Set(['u2', 'u3']))
    vi.mocked(fetchRecentShowRatingsAllUsers).mockResolvedValue([
      ratingFor(friend, { id: 'r-friend' }),
      ratingFor(stranger, { id: 'r-stranger', show_id: 2, show_name: 'Show Two' }),
    ])
    renderActivity()
    await waitFor(() => expect(screen.getByText('Filter by person')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Filter by person'))
    await waitFor(() => expect(screen.getByText('@friend')).toBeInTheDocument())
    expect(screen.queryByText('All')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('@friend'))
    await waitFor(() => expect(screen.queryByText('Rated Show Two')).not.toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /@friend/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Filter by person' })
    fireEvent.click(within(dialog).getByText('@friend'))
    await waitFor(() => expect(screen.getByText('Rated Show Two')).toBeInTheDocument())
    expect(screen.getByText('Rated Show One')).toBeInTheDocument()
    expect(screen.getByText('Filter by person')).toBeInTheDocument()
  })

  it('renders the person-filter dropdown as a floating overlay, not an inline block', async () => {
    vi.mocked(fetchFollowingIds).mockResolvedValue(new Set(['u2', 'u3']))
    vi.mocked(fetchRecentShowRatingsAllUsers).mockResolvedValue([
      ratingFor(friend, { id: 'r-friend' }),
      ratingFor(stranger, { id: 'r-stranger', show_id: 2, show_name: 'Show Two' }),
    ])
    renderActivity()
    await waitFor(() => expect(screen.getByText('Filter by person')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Filter by person'))
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Filter by person' })).toBeInTheDocument())
    expect(screen.getByRole('dialog', { name: 'Filter by person' })).toHaveClass('absolute')
  })

  it('right-aligns the person-filter dropdown to its trigger, so it never overflows the viewport', async () => {
    vi.mocked(fetchFollowingIds).mockResolvedValue(new Set(['u2', 'u3']))
    vi.mocked(fetchRecentShowRatingsAllUsers).mockResolvedValue([
      ratingFor(friend, { id: 'r-friend' }),
      ratingFor(stranger, { id: 'r-stranger', show_id: 2, show_name: 'Show Two' }),
    ])
    renderActivity()
    await waitFor(() => expect(screen.getByText('Filter by person')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Filter by person'))
    const dialog = await screen.findByRole('dialog', { name: 'Filter by person' })
    expect(dialog).toHaveClass('right-0')
    expect(dialog).not.toHaveClass('inset-x-0', 'mx-auto')
  })

  it('closes the person-filter dropdown on an outside pointerdown', async () => {
    vi.mocked(fetchFollowingIds).mockResolvedValue(new Set(['u2', 'u3']))
    vi.mocked(fetchRecentShowRatingsAllUsers).mockResolvedValue([
      ratingFor(friend, { id: 'r-friend' }),
      ratingFor(stranger, { id: 'r-stranger', show_id: 2, show_name: 'Show Two' }),
    ])
    renderActivity()
    await waitFor(() => expect(screen.getByText('Filter by person')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Filter by person'))
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Filter by person' })).toBeInTheDocument())

    fireEvent.pointerDown(document.body)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('renders follow events via FollowActivityRow', async () => {
    const follow: Follow = { id: 'f1', follower_id: 'u2', followed_id: 'u3', created_at: '2026-01-01T00:00:00Z' }
    vi.mocked(fetchFollowingIds).mockResolvedValue(new Set(['u2']))
    vi.mocked(fetchAllFollows).mockResolvedValue([follow])
    renderActivity()
    await waitFor(() => expect(screen.getByText('Followed stranger')).toBeInTheDocument())
  })

  it('shows a friend\'s in-progress show in Now Watching, excluding the signed-in user\'s own', async () => {
    vi.mocked(fetchFollowingIds).mockResolvedValue(new Set(['u2']))
    vi.mocked(fetchStartedAllUsers).mockResolvedValue([startedFor(friend), startedFor(me, { id: 's-me', show_id: 9 })])
    renderActivity()
    await waitFor(() => expect(screen.getAllByText('Show One').length).toBeGreaterThan(0))
    expect(screen.getByText('@friend')).toBeInTheDocument()
    expect(screen.getByText('0/10 episodes')).toBeInTheDocument()
  })

  it("hides a followed person's Now Watching entry after switching back to Following scope", async () => {
    vi.mocked(fetchFollowingIds).mockResolvedValue(new Set(['u2']))
    vi.mocked(fetchStartedAllUsers).mockResolvedValue([
      startedFor(friend),
      startedFor(stranger, { id: 's-stranger', show_id: 2, show_name: 'Show Two' }),
    ])
    renderActivity()
    await waitFor(() => expect(screen.getAllByText('Show One').length).toBeGreaterThan(0))
    expect(screen.queryByText('Show Two')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Everyone'))
    await waitFor(() => expect(screen.getAllByText('Show Two').length).toBeGreaterThan(0))

    fireEvent.click(screen.getByText('Following'))
    await waitFor(() => expect(screen.queryByText('Show Two')).not.toBeInTheDocument())
    expect(screen.getAllByText('Show One').length).toBeGreaterThan(0)
  })

  it('shows an empty message in Now Watching when nobody followed is watching anything', async () => {
    vi.mocked(fetchFollowingIds).mockResolvedValue(new Set(['u2']))
    renderActivity()
    await waitFor(() =>
      expect(screen.getByText('Nobody you follow is watching anything right now.')).toBeInTheDocument(),
    )
  })

  it('offers a genre filter once show details resolve, and filters Now Watching by the selected genre', async () => {
    vi.mocked(fetchFollowingIds).mockResolvedValue(new Set(['u2']))
    vi.mocked(fetchStartedAllUsers).mockResolvedValue([
      startedFor(friend),
      startedFor(friend, { id: 's-friend-2', show_id: 2, show_name: 'Show Two' }),
    ])
    vi.mocked(getShowDetailsBulk).mockResolvedValue(
      new Map([
        [1, showDetail({ genres: [{ id: 1, name: 'Drama' }] })],
        [2, showDetail({ id: 2, name: 'Show Two', genres: [{ id: 2, name: 'Comedy' }] })],
      ]),
    )
    renderActivity()
    await waitFor(() => expect(screen.getAllByText('Show Two').length).toBeGreaterThan(0))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Genre' })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Genre' }))
    const dialog = await screen.findByRole('dialog', { name: 'Filter by genre' })
    fireEvent.click(within(dialog).getByText('Drama'))

    await waitFor(() => expect(screen.queryByText('Show Two')).not.toBeInTheDocument())
    expect(screen.getAllByText('Show One').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Genre · 1' })).toBeInTheDocument()
  })

  it('does not show a genre filter when everything in Now Watching shares one genre', async () => {
    vi.mocked(fetchFollowingIds).mockResolvedValue(new Set(['u2']))
    vi.mocked(fetchStartedAllUsers).mockResolvedValue([startedFor(friend)])
    vi.mocked(getShowDetailsBulk).mockResolvedValue(new Map([[1, showDetail()]]))
    renderActivity()
    await waitFor(() => expect(screen.getAllByText('Show One').length).toBeGreaterThan(0))
    expect(screen.queryByRole('button', { name: /Genre/ })).not.toBeInTheDocument()
  })

  it('closes the genre filter panel via its close button, and Clear resets the selection', async () => {
    vi.mocked(fetchFollowingIds).mockResolvedValue(new Set(['u2']))
    vi.mocked(fetchStartedAllUsers).mockResolvedValue([
      startedFor(friend),
      startedFor(friend, { id: 's-friend-2', show_id: 2, show_name: 'Show Two' }),
    ])
    vi.mocked(getShowDetailsBulk).mockResolvedValue(
      new Map([
        [1, showDetail({ genres: [{ id: 1, name: 'Drama' }] })],
        [2, showDetail({ id: 2, name: 'Show Two', genres: [{ id: 2, name: 'Comedy' }] })],
      ]),
    )
    renderActivity()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Genre' })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Genre' }))
    const dialog = await screen.findByRole('dialog', { name: 'Filter by genre' })
    fireEvent.click(within(dialog).getByText('Drama'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Genre · 1' })).toBeInTheDocument())

    fireEvent.click(within(dialog).getByText('Clear'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Genre' })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Filter by genre' })).not.toBeInTheDocument())
  })

  it('caps Now Watching to a preview, and Show all / Show less reveals or collapses the rest', async () => {
    vi.mocked(fetchFollowingIds).mockResolvedValue(new Set(['u2']))
    const total = NOW_WATCHING_PREVIEW_LIMIT + 2
    vi.mocked(fetchStartedAllUsers).mockResolvedValue(
      Array.from({ length: total }, (_, i) =>
        startedFor(friend, { id: `s-friend-${i}`, show_id: i + 1, show_name: `Show ${i + 1}` }),
      ),
    )
    renderActivity()
    await waitFor(() => expect(screen.getAllByText(/episodes$/).length).toBe(NOW_WATCHING_PREVIEW_LIMIT))
    expect(screen.getByText(`Show all ${total}`)).toBeInTheDocument()

    fireEvent.click(screen.getByText(`Show all ${total}`))
    expect(screen.getAllByText(/episodes$/).length).toBe(total)

    fireEvent.click(screen.getByText('Show less'))
    expect(screen.getAllByText(/episodes$/).length).toBe(NOW_WATCHING_PREVIEW_LIMIT)
  })

  it('does not show a Show all toggle when Now Watching fits within the preview limit', async () => {
    vi.mocked(fetchFollowingIds).mockResolvedValue(new Set(['u2']))
    vi.mocked(fetchStartedAllUsers).mockResolvedValue([startedFor(friend)])
    renderActivity()
    await waitFor(() => expect(screen.getAllByText('Show One').length).toBeGreaterThan(0))
    expect(screen.queryByText(/Show all/)).not.toBeInTheDocument()
  })
})

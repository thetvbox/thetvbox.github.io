import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../lib/showRatings', () => ({ fetchRecentShowRatings: vi.fn() }))
vi.mock('../lib/watched', () => ({ fetchRecentWatched: vi.fn() }))
vi.mock('../lib/showStarted', () => ({ fetchStartedForUser: vi.fn() }))
vi.mock('../lib/showDismissed', () => ({ fetchDismissedForUser: vi.fn() }))
vi.mock('../lib/showDropped', () => ({ fetchDroppedForUser: vi.fn() }))
vi.mock('../lib/watchlist', () => ({ fetchWatchlist: vi.fn() }))
vi.mock('../lib/lists', () => ({ fetchListsForUser: vi.fn() }))
vi.mock('../hooks/useStreamingPlatforms', () => ({ useStreamingPlatforms: vi.fn() }))
vi.mock('../lib/seasonProgress', async () => {
  const actual = await vi.importActual<typeof import('../lib/seasonProgress')>('../lib/seasonProgress')
  return {
    ...actual,
    fetchSeasonBreakdowns: vi.fn(),
    fetchNextEpisode: vi.fn(),
  }
})

import { useAuth } from '../contexts/AuthContext'
import { fetchRecentShowRatings } from '../lib/showRatings'
import { fetchRecentWatched } from '../lib/watched'
import { fetchStartedForUser } from '../lib/showStarted'
import { fetchDismissedForUser } from '../lib/showDismissed'
import { fetchDroppedForUser } from '../lib/showDropped'
import { fetchWatchlist } from '../lib/watchlist'
import { fetchListsForUser } from '../lib/lists'
import { useStreamingPlatforms } from '../hooks/useStreamingPlatforms'
import { fetchSeasonBreakdowns, fetchNextEpisode } from '../lib/seasonProgress'
import { HOME_PREVIEW_LIMIT } from '../lib/constants'
import Home from './Home'
import type { AppUser, EpisodeWatched, ShowListWithCount, WatchlistItem } from '../types'
import type { TmdbSeasonSummary } from '../types'

const me: AppUser = { id: 'u1', email: 'me@example.com', username: 'me', created_at: '2026-01-01T00:00:00Z' }

function watchedRow(overrides: Partial<EpisodeWatched> = {}): EpisodeWatched {
  return {
    id: 'w1',
    user_id: 'u1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: '/poster1.jpg',
    show_total_episodes: null,
    season_number: 1,
    episode_number: 1,
    episode_name: 'Pilot',
    watched_at: '2026-01-01T00:00:00Z',
    watched_at_unknown: false,
    runtime_minutes: 42,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function watchlistItem(overrides: Partial<WatchlistItem> = {}): WatchlistItem {
  return {
    id: 'wl1',
    user_id: 'u1',
    show_id: 2,
    show_name: 'Show Two',
    show_poster_path: '/poster2.jpg',
    added_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function listWithCount(overrides: Partial<ShowListWithCount> = {}): ShowListWithCount {
  return {
    id: 'l1',
    user_id: 'u1',
    name: 'Favorites',
    description: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    itemCount: 3,
    ...overrides,
  }
}

function season(overrides: Partial<TmdbSeasonSummary> = {}): TmdbSeasonSummary {
  return {
    id: 1,
    name: 'Season 1',
    season_number: 1,
    episode_count: 10,
    air_date: '2026-01-01',
    poster_path: null,
    ...overrides,
  }
}

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(fetchRecentShowRatings).mockReset().mockResolvedValue([])
  vi.mocked(fetchRecentWatched).mockReset().mockResolvedValue([])
  vi.mocked(fetchStartedForUser).mockReset().mockResolvedValue([])
  vi.mocked(fetchDismissedForUser).mockReset().mockResolvedValue([])
  vi.mocked(fetchDroppedForUser).mockReset().mockResolvedValue([])
  vi.mocked(fetchWatchlist).mockReset().mockResolvedValue([])
  vi.mocked(fetchListsForUser).mockReset().mockResolvedValue([])
  vi.mocked(fetchSeasonBreakdowns).mockReset().mockResolvedValue(new Map())
  vi.mocked(fetchNextEpisode).mockReset().mockResolvedValue(null)
  vi.mocked(useStreamingPlatforms).mockReturnValue({ platforms: new Map(), loading: false })
  vi.mocked(useAuth).mockReturnValue({
    user: me,
    loading: false,
    findByEmail: vi.fn(),
    register: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })
})

describe('Home', () => {
  it('shows a loading skeleton before data resolves', () => {
    vi.mocked(fetchRecentShowRatings).mockReturnValue(new Promise(() => {}))
    const { container } = renderHome()
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('shows an empty state with nothing in progress', async () => {
    renderHome()
    await waitFor(() => expect(screen.getByText(/Nothing in progress/)).toBeInTheDocument())
  })

  it('shows an error message when loading fails', async () => {
    vi.mocked(fetchRecentShowRatings).mockRejectedValue(new Error('load failed'))
    renderHome()
    await waitFor(() => expect(screen.getByText('load failed')).toBeInTheDocument())
  })

  it('renders a show that is currently being watched', async () => {
    vi.mocked(fetchRecentWatched).mockResolvedValue([watchedRow()])
    renderHome()
    await waitFor(() => expect(screen.getByText('Show One')).toBeInTheDocument())
  })

  it('keeps the skeleton up until season and episode enrichment finishes, avoiding a partial-content flash', async () => {
    vi.mocked(fetchRecentWatched).mockResolvedValue([watchedRow()])
    let resolveBreakdowns!: (value: Map<number, TmdbSeasonSummary[]>) => void
    vi.mocked(fetchSeasonBreakdowns).mockReturnValue(
      new Promise((resolve) => {
        resolveBreakdowns = resolve
      }),
    )
    vi.mocked(fetchNextEpisode).mockResolvedValue({ seasonNumber: 1, episodeNumber: 2, airDate: '2026-02-01' })
    const { container } = renderHome()

    await waitFor(() => expect(fetchSeasonBreakdowns).toHaveBeenCalled())
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    expect(screen.queryByText('Show One')).not.toBeInTheDocument()

    resolveBreakdowns(new Map([[1, [season({ season_number: 1, episode_count: 10 })]]]))

    await waitFor(() => expect(screen.getAllByText('Show One').length).toBeGreaterThan(0))
    expect(screen.getByText(/New episode/)).toBeInTheDocument()
  })

  it('renders the watchlist section', async () => {
    vi.mocked(fetchWatchlist).mockResolvedValue([watchlistItem()])
    renderHome()
    await waitFor(() => expect(screen.getByText('Your Watchlist')).toBeInTheDocument())
    expect(screen.getByText('Show Two')).toBeInTheDocument()
  })

  it('shows "Manage" instead of "See all" when the watchlist is within the preview limit', async () => {
    vi.mocked(fetchWatchlist).mockResolvedValue([watchlistItem()])
    renderHome()
    await waitFor(() => expect(screen.getByText('Your Watchlist')).toBeInTheDocument())
    expect(screen.getByRole('link', { name: /Manage/ })).toBeInTheDocument()
  })

  it('shows "See all" and caps the preview when the watchlist exceeds the preview limit', async () => {
    const items = Array.from({ length: HOME_PREVIEW_LIMIT + 2 }, (_, i) =>
      watchlistItem({ id: `wl${i}`, show_id: 100 + i, show_name: `Watchlist Show ${i}` }),
    )
    vi.mocked(fetchWatchlist).mockResolvedValue(items)
    renderHome()
    await waitFor(() => expect(screen.getByRole('link', { name: /See all/ })).toBeInTheDocument())
    expect(screen.getByText('Watchlist Show 0')).toBeInTheDocument()
    expect(screen.getByText(`Watchlist Show ${HOME_PREVIEW_LIMIT - 1}`)).toBeInTheDocument()
    expect(screen.queryByText(`Watchlist Show ${HOME_PREVIEW_LIMIT}`)).not.toBeInTheDocument()
  })

  it('renders the lists section', async () => {
    vi.mocked(fetchListsForUser).mockResolvedValue([listWithCount()])
    renderHome()
    await waitFor(() => expect(screen.getByText('Your Lists')).toBeInTheDocument())
    expect(screen.getByText('Favorites')).toBeInTheDocument()
  })

  it('shows "Manage" instead of "See all" when lists are within the preview limit', async () => {
    vi.mocked(fetchListsForUser).mockResolvedValue([listWithCount()])
    renderHome()
    await waitFor(() => expect(screen.getByText('Your Lists')).toBeInTheDocument())
    expect(screen.getByRole('link', { name: /Manage/ })).toBeInTheDocument()
  })

  it('shows "See all" and caps the preview when lists exceed the preview limit', async () => {
    const items = Array.from({ length: HOME_PREVIEW_LIMIT + 2 }, (_, i) => listWithCount({ id: `l${i}`, name: `List ${i}` }))
    vi.mocked(fetchListsForUser).mockResolvedValue(items)
    renderHome()
    await waitFor(() => expect(screen.getByRole('link', { name: /See all/ })).toBeInTheDocument())
    expect(screen.getByText('List 0')).toBeInTheDocument()
    expect(screen.getByText(`List ${HOME_PREVIEW_LIMIT - 1}`)).toBeInTheDocument()
    expect(screen.queryByText(`List ${HOME_PREVIEW_LIMIT}`)).not.toBeInTheDocument()
  })

  it('does not fetch when there is no signed-in user', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      findByEmail: vi.fn(),
      register: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    })
    renderHome()
    expect(fetchRecentShowRatings).not.toHaveBeenCalled()
  })
})

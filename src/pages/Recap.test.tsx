import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../lib/showRatings', () => ({ fetchRecentShowRatings: vi.fn() }))
vi.mock('../lib/watched', () => ({ fetchRecentWatched: vi.fn() }))
vi.mock('../lib/rewatches', () => ({ fetchRecentRewatches: vi.fn() }))

import { useAuth } from '../contexts/AuthContext'
import { fetchRecentShowRatings } from '../lib/showRatings'
import { fetchRecentWatched } from '../lib/watched'
import { fetchRecentRewatches } from '../lib/rewatches'
import Recap from './Recap'
import type { AppUser, EpisodeWatched, ShowRating } from '../types'

const me: AppUser = { id: 'u1', email: 'me@example.com', username: 'me', created_at: '2026-01-01T00:00:00Z' }

function rating(overrides: Partial<ShowRating> = {}): ShowRating {
  return {
    id: 'r1',
    user_id: 'u1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    rating: 4.5,
    rated_at: '2024-06-01T12:00:00Z',
    ...overrides,
  }
}

function watchedRow(overrides: Partial<EpisodeWatched> = {}): EpisodeWatched {
  return {
    id: 'w1',
    user_id: 'u1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    show_total_episodes: 10,
    season_number: 1,
    episode_number: 1,
    episode_name: 'Pilot',
    watched_at: '2024-06-01T12:00:00Z',
    watched_at_unknown: false,
    runtime_minutes: 42,
    created_at: '2024-06-01T12:00:00Z',
    ...overrides,
  }
}

function renderRecap() {
  return render(
    <MemoryRouter>
      <Recap />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(fetchRecentShowRatings).mockReset().mockResolvedValue([])
  vi.mocked(fetchRecentWatched).mockReset().mockResolvedValue([])
  vi.mocked(fetchRecentRewatches).mockReset().mockResolvedValue([])
  vi.mocked(useAuth).mockReturnValue({
    user: me,
    loading: false,
    findByEmail: vi.fn(),
    register: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })
})

describe('Recap', () => {
  it('shows a loading skeleton before data resolves', () => {
    vi.mocked(fetchRecentShowRatings).mockReturnValue(new Promise(() => {}))
    const { container } = renderRecap()
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('shows an empty state when there is nothing tracked', async () => {
    renderRecap()
    await waitFor(() => expect(screen.getByText(/Nothing tracked yet/)).toBeInTheDocument())
  })

  it('shows an error message when loading fails', async () => {
    vi.mocked(fetchRecentShowRatings).mockRejectedValue(new Error('load failed'))
    renderRecap()
    await waitFor(() => expect(screen.getByText('load failed')).toBeInTheDocument())
  })

  it('shows recap stats for the most recent year with data', async () => {
    vi.mocked(fetchRecentShowRatings).mockResolvedValue([rating()])
    vi.mocked(fetchRecentWatched).mockResolvedValue([watchedRow(), watchedRow({ id: 'w2', episode_number: 2 })])
    renderRecap()
    await waitFor(() => expect(screen.getByText('Shows finished')).toBeInTheDocument())
    expect(screen.getByText('Ratings given')).toBeInTheDocument()
    expect(screen.getByText('Top rated')).toBeInTheDocument()
    expect(screen.getByText('Show One')).toBeInTheDocument()
  })

  it('shows year-selector buttons when multiple years have data, and switches on click', async () => {
    vi.mocked(fetchRecentShowRatings).mockResolvedValue([
      rating({ id: 'r1', rated_at: '2024-06-01T12:00:00Z' }),
      rating({ id: 'r2', rated_at: '2025-06-01T12:00:00Z', show_id: 2, show_name: 'Show Two' }),
    ])
    renderRecap()
    await waitFor(() => expect(screen.getByText('2025')).toBeInTheDocument())
    expect(screen.getByText('2024')).toBeInTheDocument()
    expect(screen.getByText('2025').closest('button')).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByText('2024'))
    await waitFor(() => expect(screen.getByText('2024').closest('button')).toHaveAttribute('aria-pressed', 'true'))
  })
})

import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../lib/users', () => ({ fetchUserByUsername: vi.fn() }))
vi.mock('../lib/showRatings', () => ({ fetchShowRating: vi.fn() }))
vi.mock('../lib/watched', () => ({ fetchWatchedForUserAndShow: vi.fn() }))
vi.mock('../lib/rewatches', () => ({ fetchRewatchesForShow: vi.fn() }))

import { useAuth } from '../contexts/AuthContext'
import { fetchUserByUsername } from '../lib/users'
import { fetchShowRating } from '../lib/showRatings'
import { fetchWatchedForUserAndShow } from '../lib/watched'
import { fetchRewatchesForShow } from '../lib/rewatches'
import ShowDiary from './ShowDiary'
import type { AppUser, EpisodeWatched, ShowRating, ShowRewatch } from '../types'

const bob: AppUser = { id: 'u1', email: 'bob@example.com', username: 'bob', created_at: '2026-01-01T00:00:00Z' }

function rating(overrides: Partial<ShowRating> = {}): ShowRating {
  return {
    id: 'r1',
    user_id: 'u1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    rating: 4.5,
    rated_at: '2026-01-01T00:00:00Z',
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
    watched_at: '2026-01-01T00:00:00Z',
    watched_at_unknown: false,
    runtime_minutes: 42,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function rewatch(overrides: Partial<ShowRewatch> = {}): ShowRewatch {
  return {
    id: 'rw1',
    user_id: 'u1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    rewatched_at: '2026-02-01T00:00:00Z',
    ...overrides,
  }
}

function renderDiary(username = 'bob', showId = '1') {
  return render(
    <MemoryRouter initialEntries={[`/u/${username}/shows/${showId}`]}>
      <Routes>
        <Route path="/u/:username/shows/:showId" element={<ShowDiary />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(fetchUserByUsername).mockReset()
  vi.mocked(fetchShowRating).mockReset().mockResolvedValue(null)
  vi.mocked(fetchWatchedForUserAndShow).mockReset().mockResolvedValue([])
  vi.mocked(fetchRewatchesForShow).mockReset().mockResolvedValue([])
  vi.mocked(useAuth).mockReturnValue({
    user: bob,
    loading: false,
    findByEmail: vi.fn(),
    register: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })
})

describe('ShowDiary', () => {
  it('shows a loading skeleton before data resolves', () => {
    vi.mocked(fetchUserByUsername).mockReturnValue(new Promise(() => {}))
    const { container } = renderDiary()
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('shows a not-found message for an unknown user', async () => {
    vi.mocked(fetchUserByUsername).mockResolvedValue(null)
    renderDiary('ghost')
    await waitFor(() => expect(screen.getByText(/No one found with username/)).toBeInTheDocument())
  })

  it('shows a no-activity message when there is nothing tracked', async () => {
    vi.mocked(fetchUserByUsername).mockResolvedValue(bob)
    renderDiary()
    await waitFor(() => expect(screen.getByText('No activity for this show yet.')).toBeInTheDocument())
  })

  it('shows the rating, show name, and watched count', async () => {
    vi.mocked(fetchUserByUsername).mockResolvedValue(bob)
    vi.mocked(fetchShowRating).mockResolvedValue(rating())
    vi.mocked(fetchWatchedForUserAndShow).mockResolvedValue([watchedRow()])
    renderDiary()
    await waitFor(() => expect(screen.getByText('Show One')).toBeInTheDocument())
    expect(screen.getByText('4.5')).toBeInTheDocument()
    expect(screen.getByText(/1 episode watched/)).toBeInTheDocument()
  })

  it('shows an unrated message when there is no rating', async () => {
    vi.mocked(fetchUserByUsername).mockResolvedValue(bob)
    vi.mocked(fetchWatchedForUserAndShow).mockResolvedValue([watchedRow()])
    renderDiary()
    await waitFor(() => expect(screen.getByText("You haven't rated this yet")).toBeInTheDocument())
  })

  it("shows a third-person unrated message for a visitor's diary", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { ...bob, id: 'me2', username: 'me' },
      loading: false,
      findByEmail: vi.fn(),
      register: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    })
    vi.mocked(fetchUserByUsername).mockResolvedValue(bob)
    vi.mocked(fetchWatchedForUserAndShow).mockResolvedValue([watchedRow()])
    renderDiary('bob')
    await waitFor(() => expect(screen.getByText("Hasn't rated this yet")).toBeInTheDocument())
  })

  it('lists rewatch dates', async () => {
    vi.mocked(fetchUserByUsername).mockResolvedValue(bob)
    vi.mocked(fetchRewatchesForShow).mockResolvedValue([rewatch()])
    renderDiary()
    await waitFor(() => expect(screen.getByText('Rewatches')).toBeInTheDocument())
  })

  it('lists watched episodes with season/episode numbers', async () => {
    vi.mocked(fetchUserByUsername).mockResolvedValue(bob)
    vi.mocked(fetchWatchedForUserAndShow).mockResolvedValue([watchedRow({ season_number: 2, episode_number: 3, episode_name: 'Title' })])
    renderDiary()
    await waitFor(() => expect(screen.getByText(/S2 · E3 — Title/)).toBeInTheDocument())
  })

  it('links to the show page', async () => {
    vi.mocked(fetchUserByUsername).mockResolvedValue(bob)
    vi.mocked(fetchWatchedForUserAndShow).mockResolvedValue([watchedRow()])
    renderDiary('bob', '1')
    await waitFor(() => expect(screen.getByText(/Open show page/)).toHaveAttribute('href', '/show/1'))
  })

  it('shows an error message when loading fails', async () => {
    vi.mocked(fetchUserByUsername).mockRejectedValue(new Error('load failed'))
    renderDiary()
    await waitFor(() => expect(screen.getByText('load failed')).toBeInTheDocument())
  })
})

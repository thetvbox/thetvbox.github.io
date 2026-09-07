import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../hooks/useShowDetail', () => ({ useShowDetail: vi.fn() }))
vi.mock('../components/Toast', () => ({
  default: ({ toast }: { toast: { message: string } | null }) => <div>{toast ? `Toast: ${toast.message}` : null}</div>,
}))
vi.mock('../components/showDetail/ShowDetailHero', () => ({ default: () => <div>Hero</div> }))
vi.mock('../components/showDetail/ShowDetailQuickActions', () => ({ default: () => <div>QuickActions</div> }))
vi.mock('../components/showDetail/ShowDetailProgress', () => ({ default: () => <div>Progress</div> }))
vi.mock('../components/showDetail/ShowDetailStreaming', () => ({ default: () => <div>Streaming</div> }))
vi.mock('../components/showDetail/ShowDetailSeasons', () => ({ default: () => <div>Seasons</div> }))

import { useAuth } from '../contexts/AuthContext'
import { useShowDetail } from '../hooks/useShowDetail'
import ShowDetail from './ShowDetail'
import type { AppUser, TmdbShowDetail } from '../types'

const me: AppUser = { id: 'u1', email: 'me@example.com', username: 'me', created_at: '2026-01-01T00:00:00Z' }

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
    number_of_episodes: 0,
    status: 'Ended',
    origin_country: ['US'],
    original_language: 'en',
    seasons: [],
    ...overrides,
  }
}

function baseState(overrides: Partial<ReturnType<typeof useShowDetail>> = {}): ReturnType<typeof useShowDetail> {
  return {
    show: null,
    season: null,
    activeSeason: null,
    setActiveSeason: vi.fn(),
    loadingShow: false,
    loadingSeason: false,
    error: null,
    region: 'US',
    regionProviders: null,
    effectiveProvider: null,
    loadingProviders: false,
    override: null,
    pickerOpen: false,
    setPickerOpen: vi.fn(),
    handlePickProvider: vi.fn(),
    handleClearOverride: vi.fn(),
    watched: {},
    watchedCount: 0,
    totalEpisodes: null,
    seasonWatchedCount: 0,
    inNowWatching: false,
    canTrackNowWatching: false,
    dismissedItem: null,
    savingNowWatching: false,
    handleToggleNowWatching: vi.fn(),
    canDropShow: false,
    droppedItem: null,
    savingDropped: false,
    handleToggleDropped: vi.fn(),
    handleToggleWatched: vi.fn(),
    handleMarkWatchedWithDate: vi.fn(),
    handleMarkAllWatched: vi.fn(),
    handleMarkSeasonWatched: vi.fn(),
    watchlistItem: null,
    savingWatchlist: false,
    handleToggleWatchlist: vi.fn(),
    listMembership: new Set<string>(),
    setListMembership: vi.fn(),
    listPickerOpen: false,
    setListPickerOpen: vi.fn(),
    rewatches: [],
    handleLogRewatch: vi.fn(),
    handleDeleteRewatch: vi.fn(),
    nextUpcomingEpisode: null,
    effectiveAirDate: vi.fn(() => null),
    showRatings: [],
    myShowRating: null,
    savingRating: false,
    handleRateShow: vi.fn(),
    seasonRatingsForActive: [],
    mySeasonRating: null,
    savingSeasonRating: false,
    handleRateSeason: vi.fn(),
    toast: null,
    dismissToast: vi.fn(),
    ...overrides,
  }
}

function renderShowDetail(id = '1') {
  return render(
    <MemoryRouter initialEntries={[`/show/${id}`]}>
      <Routes>
        <Route path="/show/:id" element={<ShowDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    user: me,
    loading: false,
    findByEmail: vi.fn(),
    register: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })
  vi.mocked(useShowDetail).mockReturnValue(baseState())
})

describe('ShowDetail', () => {
  it('shows an invalid-show message for a non-numeric id', () => {
    renderShowDetail('not-a-number')
    expect(screen.getByText('Invalid show.')).toBeInTheDocument()
  })

  it('shows an error message when loading fails with no show data', () => {
    vi.mocked(useShowDetail).mockReturnValue(baseState({ error: 'load failed' }))
    renderShowDetail()
    expect(screen.getByText('load failed')).toBeInTheDocument()
  })

  it('renders the hero and streaming sections once loaded', () => {
    vi.mocked(useShowDetail).mockReturnValue(baseState({ show: show() }))
    renderShowDetail()
    expect(screen.getByText('Hero')).toBeInTheDocument()
    expect(screen.getByText('Streaming')).toBeInTheDocument()
  })

  it('hides quick actions while the show is still loading', () => {
    vi.mocked(useShowDetail).mockReturnValue(baseState({ show: show(), loadingShow: true }))
    renderShowDetail()
    expect(screen.queryByText('QuickActions')).not.toBeInTheDocument()
  })

  it('shows quick actions once the show has loaded', () => {
    vi.mocked(useShowDetail).mockReturnValue(baseState({ show: show(), loadingShow: false }))
    renderShowDetail()
    expect(screen.getByText('QuickActions')).toBeInTheDocument()
  })

  it('shows progress only when the show has episodes', () => {
    vi.mocked(useShowDetail).mockReturnValue(baseState({ show: show({ number_of_episodes: 0 }) }))
    renderShowDetail()
    expect(screen.queryByText('Progress')).not.toBeInTheDocument()
  })

  it('shows progress when the show has episodes', () => {
    vi.mocked(useShowDetail).mockReturnValue(baseState({ show: show({ number_of_episodes: 10 }), totalEpisodes: 10 }))
    renderShowDetail()
    expect(screen.getByText('Progress')).toBeInTheDocument()
  })

  it('renders the overview and genre chips', () => {
    vi.mocked(useShowDetail).mockReturnValue(
      baseState({ show: show({ overview: 'A great show.', genres: [{ id: 1, name: 'Drama' }] }) }),
    )
    renderShowDetail()
    expect(screen.getByText('A great show.')).toBeInTheDocument()
    expect(screen.getByText('Drama')).toBeInTheDocument()
  })

  it('renders seasons once a season is loaded and active', () => {
    vi.mocked(useShowDetail).mockReturnValue(
      baseState({
        show: show({ seasons: [{ id: 1, season_number: 1, name: 'Season 1', episode_count: 5, poster_path: null, air_date: '2020-01-01' }] }),
        activeSeason: 1,
      }),
    )
    renderShowDetail()
    expect(screen.getByText('Seasons')).toBeInTheDocument()
  })

  it('does not render seasons when the show has none', () => {
    vi.mocked(useShowDetail).mockReturnValue(baseState({ show: show({ seasons: [] }) }))
    renderShowDetail()
    expect(screen.queryByText('Seasons')).not.toBeInTheDocument()
  })

  it('renders an active toast message', () => {
    vi.mocked(useShowDetail).mockReturnValue(
      baseState({ show: show(), toast: { message: 'Saved!', tone: 'info' } }),
    )
    renderShowDetail()
    expect(screen.getByText('Toast: Saved!')).toBeInTheDocument()
  })
})

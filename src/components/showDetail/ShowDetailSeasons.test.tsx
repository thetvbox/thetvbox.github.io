import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)

import ShowDetailSeasons from './ShowDetailSeasons'
import { watchedKey } from '../../lib/watched'
import type { EpisodeWatched, TmdbEpisode, TmdbSeasonDetail, TmdbShowDetail, WatchedMap } from '../../types'

function episode(overrides: Partial<TmdbEpisode> = {}): TmdbEpisode {
  return {
    id: 1,
    episode_number: 1,
    season_number: 1,
    name: 'The Pilot',
    overview: '',
    still_path: null,
    air_date: '2020-01-01',
    runtime: 42,
    ...overrides,
  }
}

function watchedEntry(overrides: Partial<EpisodeWatched> = {}): EpisodeWatched {
  return {
    id: 'w1',
    user_id: 'u1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    show_total_episodes: 10,
    season_number: 1,
    episode_number: 1,
    episode_name: 'The Pilot',
    watched_at: '2026-01-01T12:00:00Z',
    watched_at_unknown: false,
    runtime_minutes: 42,
    created_at: '2026-01-01T12:00:00Z',
    ...overrides,
  }
}

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
    number_of_episodes: 2,
    status: 'Ended',
    origin_country: ['US'],
    original_language: 'en',
    seasons: [{ id: 1, season_number: 1, name: 'Season 1', episode_count: 2, poster_path: null, air_date: '2020-01-01' }],
    ...overrides,
  }
}

function season(overrides: Partial<TmdbSeasonDetail> = {}): TmdbSeasonDetail {
  return {
    id: 1,
    season_number: 1,
    name: 'Season 1',
    episodes: [episode(), episode({ id: 2, episode_number: 2, name: 'Episode Two' })],
    ...overrides,
  }
}

function renderSeasons(props: Partial<Parameters<typeof ShowDetailSeasons>[0]> = {}, watched: WatchedMap = {}) {
  return render(
    <ShowDetailSeasons
      show={show()}
      activeSeason={1}
      onSelectSeason={vi.fn()}
      season={season()}
      loadingSeason={false}
      seasonWatchedCount={0}
      onMarkSeasonWatched={vi.fn()}
      seasonRatings={[]}
      myRating={0}
      savingSeasonRating={false}
      onRateSeason={vi.fn()}
      nextUpcomingEpisode={null}
      watched={watched}
      effectiveAirDate={(ep) => ep.air_date}
      onToggleWatched={vi.fn()}
      onMarkWatchedWithDate={vi.fn()}
      {...props}
    />,
  )
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

describe('ShowDetailSeasons', () => {
  it('renders an episode row per episode in the active season', () => {
    renderSeasons()
    expect(screen.getByText('The Pilot')).toBeInTheDocument()
    expect(screen.getByText('Episode Two')).toBeInTheDocument()
  })

  it('shows a loading skeleton while the season is loading', () => {
    const { container } = renderSeasons({ loadingSeason: true, season: null })
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    expect(screen.queryByText('The Pilot')).not.toBeInTheDocument()
  })

  it('shows the "next upcoming episode" banner when provided', () => {
    renderSeasons({
      nextUpcomingEpisode: episode({ season_number: 2, episode_number: 1, air_date: '2026-05-01' }),
    })
    expect(screen.getByText(/New episode: S2E1 airs/)).toBeInTheDocument()
  })

  it('shows the watched fraction for the season', () => {
    renderSeasons({ seasonWatchedCount: 1 })
    expect(screen.getByText('1/2 watched this season')).toBeInTheDocument()
  })

  it('shows the mark-season-watched control only when the season is incomplete', () => {
    const { rerender } = renderSeasons({ seasonWatchedCount: 1 })
    expect(screen.getByText('Mark season watched')).toBeInTheDocument()
    rerender(
      <ShowDetailSeasons
        show={show()}
        activeSeason={1}
        onSelectSeason={vi.fn()}
        season={season()}
        loadingSeason={false}
        seasonWatchedCount={2}
        onMarkSeasonWatched={vi.fn()}
        seasonRatings={[]}
        myRating={0}
        savingSeasonRating={false}
        onRateSeason={vi.fn()}
        nextUpcomingEpisode={null}
        watched={{}}
        effectiveAirDate={(ep) => ep.air_date}
        onToggleWatched={vi.fn()}
        onMarkWatchedWithDate={vi.fn()}
      />,
    )
    expect(screen.queryByText('Mark season watched')).not.toBeInTheDocument()
  })

  it('marks episodes present in the watched map as watched', () => {
    const watched: WatchedMap = { [watchedKey(1, 1)]: watchedEntry() }
    renderSeasons({}, watched)
    expect(screen.getAllByText(/^Watched/).length).toBeGreaterThan(0)
  })

  it('calls onSelectSeason when a season tab is clicked', () => {
    const onSelectSeason = vi.fn()
    renderSeasons({
      show: show({
        seasons: [
          { id: 1, season_number: 1, name: 'Season 1', episode_count: 2, poster_path: null, air_date: null },
          { id: 2, season_number: 2, name: 'Season 2', episode_count: 2, poster_path: null, air_date: null },
        ],
      }),
      onSelectSeason,
    })
    fireEvent.click(screen.getByText('Season 2'))
    expect(onSelectSeason).toHaveBeenCalledWith(2)
  })

  it('renders the season rating summary with the right label', () => {
    renderSeasons({ activeSeason: 3 })
    expect(screen.getByRole('radiogroup', { name: 'Rate Season 3' })).toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)

import ShowDetailHero from './ShowDetailHero'
import type { TmdbShowDetail } from '../../types'

function show(overrides: Partial<TmdbShowDetail> = {}): TmdbShowDetail {
  return {
    id: 1,
    name: 'Show One',
    overview: '',
    poster_path: '/poster.jpg',
    backdrop_path: null,
    first_air_date: '2020-01-01',
    genres: [],
    number_of_seasons: 3,
    number_of_episodes: 30,
    status: 'Ended',
    origin_country: ['US'],
    original_language: 'en',
    seasons: [],
    ...overrides,
  }
}

function renderHero(props: Partial<Parameters<typeof ShowDetailHero>[0]> = {}) {
  return render(
    <MemoryRouter>
      <ShowDetailHero
        show={show()}
        loadingShow={false}
        showRatings={[]}
        myRating={0}
        savingRating={false}
        onRateShow={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('ShowDetailHero', () => {
  it('shows a loading skeleton when loadingShow is true', () => {
    const { container } = renderHero({ loadingShow: true })
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    expect(screen.queryByText('Show One')).not.toBeInTheDocument()
  })

  it('renders the show name, year, season count, and status', () => {
    renderHero()
    expect(screen.getByText('Show One')).toBeInTheDocument()
    expect(screen.getByText(/2020 · 3 seasons · Ended/)).toBeInTheDocument()
  })

  it('uses singular "season" for a single-season show', () => {
    renderHero({ show: show({ number_of_seasons: 1 }) })
    expect(screen.getByText(/1 season ·/)).toBeInTheDocument()
  })

  it('renders nothing in the title area when show is null and not loading', () => {
    renderHero({ show: null })
    expect(screen.queryByText('Show One')).not.toBeInTheDocument()
  })

  it('does not render a poster image when poster_path is null', () => {
    const { container } = renderHero({ show: show({ poster_path: null }) })
    expect(container.querySelector('img')).not.toBeInTheDocument()
  })

  it('renders the rating summary once loaded', () => {
    renderHero()
    expect(screen.getByRole('radiogroup', { name: 'Rate this show' })).toBeInTheDocument()
  })

  it('shows an estimated rating from season ratings when the show itself is unrated', () => {
    renderHero({
      estimatedShowRating: {
        average: 4.25,
        seasons: [
          { id: 's1', user_id: 'me', show_id: 1, show_name: 'Show One', show_poster_path: null, season_number: 1, season_name: null, rating: 4, rated_at: '2026-01-01', users: null },
        ],
      },
    })
    expect(screen.getByText('~4.3')).toBeInTheDocument()
    expect(screen.getByText('(1 season rated)')).toBeInTheDocument()
  })

  it('does not show an estimated rating once the show itself has been rated', () => {
    renderHero({ myRating: 4, estimatedShowRating: null })
    expect(screen.queryByText(/season rated/)).not.toBeInTheDocument()
  })
})

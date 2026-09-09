import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)

import EstimatedShowRating from './EstimatedShowRating'
import type { SeasonRatingWithUser } from '../types'

function season(overrides: Partial<SeasonRatingWithUser> = {}): SeasonRatingWithUser {
  return {
    id: 's1',
    user_id: 'me',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    season_number: 1,
    season_name: null,
    rating: 4,
    rated_at: '2026-01-01',
    users: null,
    ...overrides,
  }
}

describe('EstimatedShowRating', () => {
  it('shows the rounded average and how many seasons it covers', () => {
    render(<EstimatedShowRating average={3.5} seasons={[season()]} />)
    expect(screen.getByText('~3.5')).toBeInTheDocument()
    expect(screen.getByText('(1 season rated)')).toBeInTheDocument()
  })

  it('uses plural "seasons" for more than one', () => {
    render(<EstimatedShowRating average={4} seasons={[season(), season({ id: 's2', season_number: 2 })]} />)
    expect(screen.getByText('(2 seasons rated)')).toBeInTheDocument()
  })

  it('does not show the per-season breakdown until clicked', () => {
    render(<EstimatedShowRating average={4} seasons={[season({ season_name: 'Season One' })]} />)
    expect(screen.queryByText('Season One')).not.toBeInTheDocument()
  })

  it('reveals each rated season and its rating when clicked', () => {
    render(
      <EstimatedShowRating
        average={4}
        seasons={[
          season({ id: 's1', season_number: 1, season_name: 'Season One', rating: 4 }),
          season({ id: 's2', season_number: 2, rating: 5 }),
        ]}
      />,
    )
    fireEvent.click(screen.getByText('(2 seasons rated)'))
    expect(screen.getByText('Season One')).toBeInTheDocument()
    expect(screen.getByText('Season 2')).toBeInTheDocument()
    expect(screen.getByText('5.0')).toBeInTheDocument()
  })
})

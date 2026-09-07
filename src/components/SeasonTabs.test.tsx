import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)

import SeasonTabs from './SeasonTabs'
import type { TmdbSeasonSummary } from '../types'

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

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

describe('SeasonTabs', () => {
  it('renders a tab per real season, hiding season 0 when there are other seasons', () => {
    render(
      <SeasonTabs
        seasons={[season({ id: 0, season_number: 0, name: 'Specials' }), season({ id: 1, season_number: 1 })]}
        active={1}
        onSelect={vi.fn()}
      />,
    )
    expect(screen.queryByText('Specials')).not.toBeInTheDocument()
    expect(screen.getByText('Season 1')).toBeInTheDocument()
  })

  it('shows a Specials-only season when it is the sole season', () => {
    render(
      <SeasonTabs
        seasons={[season({ id: 0, season_number: 0 })]}
        active={0}
        onSelect={vi.fn()}
      />,
    )
    expect(screen.getByText('Specials')).toBeInTheDocument()
  })

  it('marks the active season as pressed', () => {
    render(
      <SeasonTabs
        seasons={[season({ id: 1, season_number: 1 }), season({ id: 2, season_number: 2 })]}
        active={2}
        onSelect={vi.fn()}
      />,
    )
    expect(screen.getByText('Season 2').closest('button')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Season 1').closest('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onSelect with the clicked season number', () => {
    const onSelect = vi.fn()
    render(
      <SeasonTabs
        seasons={[season({ id: 1, season_number: 1 }), season({ id: 2, season_number: 2 })]}
        active={1}
        onSelect={onSelect}
      />,
    )
    fireEvent.click(screen.getByText('Season 2'))
    expect(onSelect).toHaveBeenCalledWith(2)
  })
})

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import UpcomingRow from './UpcomingRow'
import type { UpcomingItem } from './UpcomingRow'

function item(overrides: Partial<UpcomingItem> = {}): UpcomingItem {
  return {
    showId: 1,
    showName: 'Show One',
    showPosterPath: null,
    seasonNumber: 2,
    episodeNumber: 5,
    airDate: '2026-05-01',
    ...overrides,
  }
}

describe('UpcomingRow', () => {
  it('links to the show route', () => {
    render(
      <MemoryRouter>
        <UpcomingRow item={item()} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link')).toHaveAttribute('href', '/show/1')
  })

  it('shows the show name and season/episode', () => {
    render(
      <MemoryRouter>
        <UpcomingRow item={item()} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Show One')).toBeInTheDocument()
    expect(screen.getByText('Season 2 · Episode 5')).toBeInTheDocument()
  })

  it('shows the formatted air date', () => {
    render(
      <MemoryRouter>
        <UpcomingRow item={item({ airDate: '2026-05-01' })} />
      </MemoryRouter>,
    )
    expect(screen.getByText('May 1')).toBeInTheDocument()
  })
})

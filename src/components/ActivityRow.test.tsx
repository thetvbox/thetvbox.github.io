import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import ActivityRow from './ActivityRow'
import type { GroupActivityEvent } from '../lib/showActivity'

function event(overrides: Partial<GroupActivityEvent> = {}): GroupActivityEvent {
  return {
    kind: 'show',
    key: 'k1',
    userId: 'u1',
    username: 'bob',
    showId: 1,
    showName: 'Show One',
    showPosterPath: null,
    rating: 4,
    finished: false,
    episodeCount: null,
    seasonNumber: null,
    at: '2026-01-01T12:00:00Z',
    atUnknown: false,
    ...overrides,
  }
}

function renderRow(e: GroupActivityEvent) {
  return render(
    <MemoryRouter>
      <ActivityRow event={e} />
    </MemoryRouter>,
  )
}

describe('ActivityRow', () => {
  it('links to the actor\'s show diary', () => {
    renderRow(event())
    expect(screen.getByRole('link')).toHaveAttribute('href', '/u/bob/shows/1')
  })

  it('shows "finished" text with episode count', () => {
    renderRow(event({ finished: true, episodeCount: 10 }))
    expect(screen.getByText(/finished/)).toBeInTheDocument()
    expect(screen.getByText(/10 episodes/)).toBeInTheDocument()
  })

  it('shows "rated ... Season N" text when a season number is present', () => {
    renderRow(event({ finished: false, seasonNumber: 2 }))
    expect(screen.getByText(/Season 2/)).toBeInTheDocument()
  })

  it('shows plain "rated" text with no season number', () => {
    renderRow(event({ finished: false, seasonNumber: null }))
    expect(screen.getByText(/rated/)).toBeInTheDocument()
  })

  it('shows the rating when present', () => {
    renderRow(event({ rating: 4.5 }))
    expect(screen.getByText('4.5')).toBeInTheDocument()
  })

  it('hides the rating badge when null', () => {
    renderRow(event({ rating: null }))
    expect(screen.queryByText(/\d\.\d/)).not.toBeInTheDocument()
  })

  it('shows "a while ago" when the timestamp is unknown', () => {
    renderRow(event({ atUnknown: true }))
    expect(screen.getByText(/a while ago/)).toBeInTheDocument()
  })
})

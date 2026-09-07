import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../hooks/useStreamingPlatforms', () => ({ useStreamingPlatforms: vi.fn() }))
vi.mock('../hooks/useShowDetails', () => ({ useShowDetails: vi.fn() }))

import { useShowDetails } from '../hooks/useShowDetails'
import { useStreamingPlatforms } from '../hooks/useStreamingPlatforms'
import HistorySection from './HistorySection'
import type { ShowActivity } from '../lib/showActivity'

function show(overrides: Partial<ShowActivity> = {}): ShowActivity {
  return {
    showId: 1,
    showName: 'Show One',
    showPosterPath: '/poster.jpg',
    rating: 4,
    ratedAt: '2026-01-01T00:00:00Z',
    watchedCount: 10,
    totalEpisodes: 10,
    lastWatchedAt: '2026-01-01T00:00:00Z',
    lastWatchedAtUnknown: false,
    finished: true,
    finishedAt: '2026-01-01T00:00:00Z',
    finishedAtUnknown: false,
    started: false,
    startedAt: null,
    dismissed: false,
    dropped: false,
    droppedAt: null,
    ...overrides,
  }
}

function renderSection(activity: ShowActivity[], props: Partial<Parameters<typeof HistorySection>[0]> = {}) {
  return render(
    <MemoryRouter>
      <HistorySection activity={activity} username="bob" emptyMessage="Nothing here yet." {...props} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(useStreamingPlatforms).mockReturnValue({ platforms: new Map(), loading: false })
  vi.mocked(useShowDetails).mockReturnValue({ details: new Map(), loading: false })
})

describe('HistorySection', () => {
  it('shows the empty state when there is no activity', () => {
    renderSection([])
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument()
  })

  it('renders a card per show', () => {
    renderSection([show({ showId: 1, showName: 'Show One' }), show({ showId: 2, showName: 'Show Two' })])
    expect(screen.getByText('Show One')).toBeInTheDocument()
    expect(screen.getByText('Show Two')).toBeInTheDocument()
  })

  it('shows the rating on a rated card', () => {
    renderSection([show({ rating: 4.5 })])
    expect(screen.getByText('4.5')).toBeInTheDocument()
  })

  it('shows "Finished" on a finished-but-unrated card', () => {
    const { container } = renderSection([show({ rating: null })])
    expect(container.querySelector('.text-accent-400')).toHaveTextContent('Finished')
  })

  it('switches sort when a sort button is clicked', () => {
    renderSection([show({ showName: 'B Show' }), show({ showId: 2, showName: 'A Show' })])
    fireEvent.click(screen.getByText('A–Z'))
    expect(screen.getByText('A–Z').closest('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('toggles the filters panel open and closed', () => {
    renderSection([show()])
    expect(screen.queryByText('Filters', { selector: 'p' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Filters'))
    expect(screen.getByText('Rating')).toBeInTheDocument()
  })

  it('shows an active-filter count badge once a filter is applied', () => {
    renderSection([show()])
    fireEvent.click(screen.getByText('Filters'))
    fireEvent.click(screen.getByText('Rated'))
    expect(screen.getByText('Filters · 1')).toBeInTheDocument()
  })

  it('shows a no-matches state when filters exclude everything, with a clear action', () => {
    renderSection([show({ rating: null })])
    fireEvent.click(screen.getByText('Filters'))
    fireEvent.click(screen.getByText('Rated'))
    expect(screen.getByText('No shows match these filters.')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Clear filters'))
    expect(screen.getByText('Show One')).toBeInTheDocument()
  })

  it('groups shows by platform when the Platform sort is selected', () => {
    vi.mocked(useStreamingPlatforms).mockReturnValue({
      platforms: new Map([[1, { provider_name: 'Netflix', logo_path: null }]]),
      loading: false,
    })
    renderSection([show({ showId: 1 })])
    fireEvent.click(screen.getByText('Platform'))
    expect(screen.getByText(/Netflix/)).toBeInTheDocument()
  })

  it('groups shows with no resolved platform under "Not free to stream"', () => {
    renderSection([show()])
    fireEvent.click(screen.getByText('Platform'))
    expect(screen.getByText(/Not free to stream/)).toBeInTheDocument()
  })
})

import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)

import RatingDistribution from './RatingDistribution'
import type { ShowRating } from '../types'

function rating(overrides: Partial<ShowRating> = {}): ShowRating {
  return {
    id: 'r1',
    user_id: 'u1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    rating: 4,
    rated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function renderWithRouter(ratings: ShowRating[]) {
  return render(
    <MemoryRouter>
      <RatingDistribution ratings={ratings} />
    </MemoryRouter>,
  )
}

describe('RatingDistribution', () => {
  it('renders nothing when there are no ratings', () => {
    const { container } = renderWithRouter([])
    expect(container).toBeEmptyDOMElement()
  })

  it('renders one bar per half-star bucket', () => {
    renderWithRouter([rating()])
    expect(screen.getAllByRole('button', { name: /show.*rated/ })).toHaveLength(10)
  })

  it('disables buckets with no shows', () => {
    renderWithRouter([rating({ rating: 4 })])
    const bucket4 = screen.getByRole('button', { name: /1 show rated 4\.0/ })
    const bucket1 = screen.getByRole('button', { name: /0 shows rated 1\.0 stars$/ })
    expect(bucket4).not.toBeDisabled()
    expect(bucket1).toBeDisabled()
  })

  it('clicking a populated bucket expands the shows behind it', () => {
    renderWithRouter([rating({ rating: 4, show_name: 'Show One' })])
    fireEvent.click(screen.getByRole('button', { name: /1 show rated 4\.0/ }))
    expect(screen.getByText('Show One')).toBeInTheDocument()
  })

  it('clicking the same bucket again collapses it', () => {
    renderWithRouter([rating({ rating: 4, show_name: 'Show One' })])
    const bucket = screen.getByRole('button', { name: /1 show rated 4\.0/ })
    fireEvent.click(bucket)
    fireEvent.click(bucket)
    expect(screen.queryByText('Show One')).not.toBeInTheDocument()
  })

  it('the Close button in the expanded panel collapses it', () => {
    renderWithRouter([rating({ rating: 4, show_name: 'Show One' })])
    fireEvent.click(screen.getByRole('button', { name: /1 show rated 4\.0/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByText('Show One')).not.toBeInTheDocument()
  })

  it('groups multiple shows in the same bucket', () => {
    renderWithRouter([rating({ id: 'r1', rating: 5, show_name: 'A' }), rating({ id: 'r2', rating: 5, show_name: 'B' })])
    fireEvent.click(screen.getByRole('button', { name: /2 shows rated 5\.0/ }))
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  it('ignores ratings that do not fall on a half-star bucket', () => {
    renderWithRouter([rating({ rating: 4.3 as never })])
    expect(screen.getByRole('button', { name: /0 shows rated 4\.0 stars$/ })).toBeDisabled()
  })
})

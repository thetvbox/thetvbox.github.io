import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)

import RatingSummary from './RatingSummary'

function renderSummary(props: Partial<Parameters<typeof RatingSummary>[0]> = {}) {
  return render(
    <MemoryRouter>
      <RatingSummary ratings={[]} myRating={0} onChange={vi.fn()} ratingLabel="Rate this" {...props} />
    </MemoryRouter>,
  )
}

describe('RatingSummary', () => {
  it('shows no others-summary button when there are no ratings', () => {
    renderSummary()
    expect(screen.queryByText(/other rating/)).not.toBeInTheDocument()
  })

  it('shows the emptyLabel when only my own rating exists', () => {
    renderSummary({
      ratings: [{ id: 'r1', user_id: 'me', rating: 4, users: { username: 'me' } }],
      currentUserId: 'me',
      myRating: 4,
    })
    expect(screen.getByText("You're the first to rate this")).toBeInTheDocument()
  })

  it("shows others' average and count", () => {
    renderSummary({
      ratings: [
        { id: 'r1', user_id: 'bob', rating: 4, users: { username: 'bob' } },
        { id: 'r2', user_id: 'alice', rating: 5, users: { username: 'alice' } },
      ],
      currentUserId: 'me',
    })
    expect(screen.getByText('4.5')).toBeInTheDocument()
    expect(screen.getByText('(2 other ratings)')).toBeInTheDocument()
  })

  it('uses singular "other rating" for exactly one', () => {
    renderSummary({ ratings: [{ id: 'r1', user_id: 'bob', rating: 4, users: { username: 'bob' } }], currentUserId: 'me' })
    expect(screen.getByText('(1 other rating)')).toBeInTheDocument()
  })

  it('does not show a Clear button when unrated', () => {
    renderSummary({ myRating: 0 })
    expect(screen.queryByLabelText('Clear your rating')).not.toBeInTheDocument()
  })

  it('shows a Clear button when rated, and clears on click', () => {
    const onChange = vi.fn()
    renderSummary({ myRating: 3, onChange })
    fireEvent.click(screen.getByLabelText('Clear your rating'))
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('expands the breakdown list when the others-summary button is clicked', () => {
    renderSummary({
      ratings: [
        { id: 'r1', user_id: 'bob', rating: 4, users: { username: 'bob' } },
        { id: 'r2', user_id: 'me', rating: 5, users: { username: 'me' } },
      ],
      currentUserId: 'me',
    })
    fireEvent.click(screen.getByText(/other rating/))
    expect(screen.getByText('You')).toBeInTheDocument()
    expect(screen.getByText('@bob')).toBeInTheDocument()
  })

  it('falls back to "unknown" for a rating with no linked user', () => {
    renderSummary({ ratings: [{ id: 'r1', user_id: 'ghost', rating: 3, users: null }], currentUserId: 'me' })
    fireEvent.click(screen.getByText(/other rating/))
    expect(screen.getByText('@unknown')).toBeInTheDocument()
  })

  it('shows a saving spinner when saving', () => {
    const { container } = renderSummary({ saving: true })
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })
})

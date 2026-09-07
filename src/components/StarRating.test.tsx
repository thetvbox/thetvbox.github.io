import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)

import StarRating from './StarRating'

describe('StarRating', () => {
  it('renders as a read-only label with no radiogroup when there is no onChange', () => {
    render(<StarRating value={3} />)
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Rated 3 out of 5 stars')).toBeInTheDocument()
  })

  it('renders as an interactive radiogroup when onChange is given', () => {
    render(<StarRating value={0} onChange={vi.fn()} />)
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
  })

  it('does not render interactive buttons when readOnly is true, even with onChange', () => {
    render(<StarRating value={2} onChange={vi.fn()} readOnly />)
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('5 stars')).not.toBeInTheDocument()
  })

  it('clicking a full-star half commits that value', () => {
    const onChange = vi.fn()
    render(<StarRating value={0} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('4 stars'))
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('clicking a half-star half commits the half value', () => {
    const onChange = vi.fn()
    render(<StarRating value={0} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('3.5 stars'))
    expect(onChange).toHaveBeenCalledWith(3.5)
  })

  it('clicking the currently-selected value clears the rating to 0', () => {
    const onChange = vi.fn()
    render(<StarRating value={4} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('4 stars'))
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('uses a custom aria-label when provided', () => {
    render(<StarRating value={0} onChange={vi.fn()} label="Rate this season" />)
    expect(screen.getByRole('radiogroup', { name: 'Rate this season' })).toBeInTheDocument()
  })
})

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)

import StarRating from './StarRating'

function stubContainerRect(container: HTMLElement) {
  const group = container.querySelector('[role="radiogroup"]') as HTMLElement
  group.getBoundingClientRect = () =>
    ({ left: 0, width: 100, top: 0, right: 100, bottom: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
  return group
}

beforeEach(() => {
  Element.prototype.setPointerCapture = vi.fn()
})

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

  it('commits a value by dragging past the drag threshold', () => {
    const onChange = vi.fn()
    const { container } = render(<StarRating value={0} onChange={onChange} />)
    const group = stubContainerRect(container)
    fireEvent.pointerDown(group, { pointerId: 1, clientX: 10 })
    fireEvent.pointerMove(group, { pointerId: 1, clientX: 30 })
    fireEvent.pointerUp(group, { pointerId: 1, clientX: 30 })
    expect(onChange).toHaveBeenCalledWith(1.5)
  })

  it('ignores small pointer movement under the drag threshold', () => {
    const onChange = vi.fn()
    const { container } = render(<StarRating value={0} onChange={onChange} />)
    const group = stubContainerRect(container)
    fireEvent.pointerDown(group, { pointerId: 1, clientX: 10 })
    fireEvent.pointerMove(group, { pointerId: 1, clientX: 12 })
    fireEvent.pointerUp(group, { pointerId: 1, clientX: 12 })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('ignores pointer events from an unrelated pointerId', () => {
    const onChange = vi.fn()
    const { container } = render(<StarRating value={0} onChange={onChange} />)
    const group = stubContainerRect(container)
    fireEvent.pointerDown(group, { pointerId: 1, clientX: 10 })
    fireEvent.pointerMove(group, { pointerId: 2, clientX: 30 })
    fireEvent.pointerUp(group, { pointerId: 2, clientX: 30 })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('clears the dragged value to 0 when dragging back to the current rating', () => {
    const onChange = vi.fn()
    const { container } = render(<StarRating value={1.5} onChange={onChange} />)
    const group = stubContainerRect(container)
    fireEvent.pointerDown(group, { pointerId: 1, clientX: 10 })
    fireEvent.pointerMove(group, { pointerId: 1, clientX: 30 })
    fireEvent.pointerUp(group, { pointerId: 1, clientX: 30 })
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('cancels a drag without committing a value', () => {
    const onChange = vi.fn()
    const { container } = render(<StarRating value={0} onChange={onChange} />)
    const group = stubContainerRect(container)
    fireEvent.pointerDown(group, { pointerId: 1, clientX: 10 })
    fireEvent.pointerMove(group, { pointerId: 1, clientX: 30 })
    fireEvent.pointerCancel(group, { pointerId: 1 })
    fireEvent.pointerUp(group, { pointerId: 1, clientX: 30 })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('does not drag when the component is read-only', () => {
    const onChange = vi.fn()
    const { container } = render(<StarRating value={0} onChange={onChange} readOnly />)
    const group = container.firstElementChild as HTMLElement
    group.getBoundingClientRect = () => ({ left: 0, width: 100, top: 0, right: 100, bottom: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    fireEvent.pointerDown(group, { pointerId: 1, clientX: 10 })
    fireEvent.pointerMove(group, { pointerId: 1, clientX: 30 })
    fireEvent.pointerUp(group, { pointerId: 1, clientX: 30 })
    expect(onChange).not.toHaveBeenCalled()
  })
})

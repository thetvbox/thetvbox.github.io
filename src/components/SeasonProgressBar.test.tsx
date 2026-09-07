import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SeasonProgressBar from './SeasonProgressBar'
import type { SeasonSegment } from '../lib/seasonProgress'

function segment(overrides: Partial<SeasonSegment> = {}): SeasonSegment {
  return { seasonNumber: 1, watched: 5, total: 10, ...overrides }
}

describe('SeasonProgressBar', () => {
  it('renders a single bar for one segment, sized by watched/total', () => {
    const { container } = render(<SeasonProgressBar segments={[segment({ watched: 5, total: 10 })]} />)
    const fill = container.querySelector('.bg-accent-500') as HTMLElement
    expect(fill.style.width).toBe('50%')
  })

  it('renders a single empty-looking bar with no segments', () => {
    const { container } = render(<SeasonProgressBar segments={[]} />)
    const fill = container.querySelector('.bg-accent-500') as HTMLElement
    expect(fill.style.width).toBe('0%')
  })

  it('renders one capsule per segment for multi-season shows', () => {
    const { container } = render(
      <SeasonProgressBar
        segments={[segment({ seasonNumber: 1, watched: 10, total: 10 }), segment({ seasonNumber: 2, watched: 0, total: 8 })]}
      />,
    )
    expect(container.querySelectorAll('[title]').length).toBe(2)
  })

  it('caps a segment fill at 100%', () => {
    const { container } = render(<SeasonProgressBar segments={[segment({ watched: 12, total: 10 })]} />)
    const fill = container.querySelector('.bg-accent-500') as HTMLElement
    expect(fill.style.width).toBe('100%')
  })

  it('handles a zero-total segment without dividing by zero', () => {
    const { container } = render(<SeasonProgressBar segments={[segment({ watched: 0, total: 0 })]} />)
    const fill = container.querySelector('.bg-accent-500') as HTMLElement
    expect(fill.style.width).toBe('0%')
  })
})

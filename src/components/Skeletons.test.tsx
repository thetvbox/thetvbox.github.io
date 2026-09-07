import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EpisodeRowSkeleton, ShowGridSkeleton } from './Skeletons'

describe('Skeletons', () => {
  it('ShowGridSkeleton renders the default 12 placeholder tiles', () => {
    const { container } = render(<ShowGridSkeleton />)
    expect(container.querySelectorAll('.animate-pulse').length).toBe(12)
  })

  it('ShowGridSkeleton renders a custom count', () => {
    const { container } = render(<ShowGridSkeleton count={3} />)
    expect(container.querySelectorAll('.animate-pulse').length).toBe(3)
  })

  it('ShowGridSkeleton shows a progress-bar placeholder when progress is true', () => {
    const { container } = render(<ShowGridSkeleton count={1} progress />)
    expect(container.querySelector('.rounded-full.bg-base-800')).toBeInTheDocument()
  })

  it('EpisodeRowSkeleton renders a single pulsing placeholder row', () => {
    const { container } = render(<EpisodeRowSkeleton />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })
})

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)

import ShowDetailProgress from './ShowDetailProgress'
import type { ShowRewatch } from '../../types'

function rewatch(overrides: Partial<ShowRewatch> = {}): ShowRewatch {
  return {
    id: 'rw1',
    user_id: 'u1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    rewatched_at: '2026-01-01T12:00:00Z',
    ...overrides,
  }
}

function renderProgress(props: Partial<Parameters<typeof ShowDetailProgress>[0]> = {}) {
  return render(
    <ShowDetailProgress
      watchedCount={5}
      totalEpisodes={10}
      onMarkAllWatched={vi.fn()}
      rewatches={[]}
      onLogRewatch={vi.fn()}
      onDeleteRewatch={vi.fn()}
      {...props}
    />,
  )
}

describe('ShowDetailProgress', () => {
  it('shows the watched-count fraction', () => {
    renderProgress({ watchedCount: 5, totalEpisodes: 10 })
    expect(screen.getByText('5 / 10 episodes watched')).toBeInTheDocument()
  })

  it('shows the mark-all-watched control when not finished', () => {
    renderProgress({ watchedCount: 5, totalEpisodes: 10 })
    expect(screen.getByText(/Mark it all watched/)).toBeInTheDocument()
    expect(screen.queryByText('Finished')).not.toBeInTheDocument()
  })

  it('shows Finished and the rewatch control once fully watched', () => {
    renderProgress({ watchedCount: 10, totalEpisodes: 10 })
    expect(screen.getByText('Finished')).toBeInTheDocument()
    expect(screen.getByText('Log a rewatch')).toBeInTheDocument()
  })

  it('calls onMarkAllWatched when the mark-all control is confirmed', async () => {
    const onMarkAllWatched = vi.fn().mockResolvedValue(undefined)
    renderProgress({ watchedCount: 0, totalEpisodes: 10, onMarkAllWatched })
    fireEvent.click(screen.getByText(/Mark it all watched/))
    fireEvent.click(screen.getByText('Confirm'))
    await waitFor(() => expect(onMarkAllWatched).toHaveBeenCalledTimes(1))
  })

  it('lists logged rewatches with a delete control', () => {
    renderProgress({ watchedCount: 10, totalEpisodes: 10, rewatches: [rewatch()] })
    expect(screen.getByLabelText('Remove this rewatch')).toBeInTheDocument()
  })

  it('calls onDeleteRewatch when a rewatch is removed', () => {
    const onDeleteRewatch = vi.fn()
    renderProgress({ watchedCount: 10, totalEpisodes: 10, rewatches: [rewatch({ id: 'rw1' })], onDeleteRewatch })
    fireEvent.click(screen.getByLabelText('Remove this rewatch'))
    expect(onDeleteRewatch).toHaveBeenCalledWith('rw1')
  })

  it('caps the progress bar width at 100% even if watchedCount somehow exceeds total', () => {
    const { container } = renderProgress({ watchedCount: 12, totalEpisodes: 10 })
    const bar = container.querySelector('.bg-accent-500') as HTMLElement
    expect(bar.style.width).toBe('100%')
  })
})

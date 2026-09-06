import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import EpisodeRow from './EpisodeRow'
import type { TmdbEpisode } from '../types'

function episode(overrides: Partial<TmdbEpisode> = {}): TmdbEpisode {
  return {
    id: 1,
    episode_number: 1,
    season_number: 1,
    name: 'The Pilot',
    overview: 'A show begins.',
    still_path: null,
    air_date: '2020-01-01',
    runtime: 42,
    ...overrides,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

describe('EpisodeRow', () => {
  it('shows "Mark watched" when not watched', () => {
    render(
      <EpisodeRow
        episode={episode()}
        watched={false}
        watchedAt={null}
        watchedAtUnknown={false}
        onToggleWatched={vi.fn()}
        onMarkWatchedWithDate={vi.fn()}
      />,
    )
    expect(screen.getByText('Mark watched')).toBeInTheDocument()
  })

  it('shows the watched date when watched with a known date', () => {
    const watchedAt = new Date(2026, 2, 5, 12, 0, 0).toISOString()
    render(
      <EpisodeRow
        episode={episode()}
        watched
        watchedAt={watchedAt}
        watchedAtUnknown={false}
        onToggleWatched={vi.fn()}
        onMarkWatchedWithDate={vi.fn()}
      />,
    )
    expect(screen.getByText(/Watched Mar 5/)).toBeInTheDocument()
  })

  it('shows "Watched a while ago" when the date is unknown', () => {
    render(
      <EpisodeRow
        episode={episode()}
        watched
        watchedAt={null}
        watchedAtUnknown
        onToggleWatched={vi.fn()}
        onMarkWatchedWithDate={vi.fn()}
      />,
    )
    expect(screen.getByText('Watched a while ago')).toBeInTheDocument()
  })

  it('shows an "Airs" badge instead of a watch control for a future episode', () => {
    render(
      <EpisodeRow
        episode={episode({ air_date: '2099-06-15' })}
        watched={false}
        watchedAt={null}
        watchedAtUnknown={false}
        onToggleWatched={vi.fn()}
        onMarkWatchedWithDate={vi.fn()}
      />,
    )
    expect(screen.getByText(/Airs/)).toBeInTheDocument()
    expect(screen.queryByText('Mark watched')).not.toBeInTheDocument()
  })

  it('calls onToggleWatched and shows a spinner while pending, then hides it', async () => {
    const { promise, resolve } = deferred<void>()
    const onToggleWatched = vi.fn(() => promise)
    render(
      <EpisodeRow
        episode={episode()}
        watched={false}
        watchedAt={null}
        watchedAtUnknown={false}
        onToggleWatched={onToggleWatched}
        onMarkWatchedWithDate={vi.fn()}
      />,
    )

    const button = screen.getByText('Mark watched').closest('button')!
    fireEvent.click(button)

    expect(onToggleWatched).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(button).toBeDisabled())

    resolve()
    await waitFor(() => expect(button).not.toBeDisabled())
  })

  it('falls back to "Episode N" when the episode has no name', () => {
    render(
      <EpisodeRow
        episode={episode({ name: '' })}
        watched={false}
        watchedAt={null}
        watchedAtUnknown={false}
        onToggleWatched={vi.fn()}
        onMarkWatchedWithDate={vi.fn()}
      />,
    )
    expect(screen.getAllByText('Episode 1').length).toBeGreaterThan(0)
  })

  it('shows a fallback synopsis when overview is empty', () => {
    render(
      <EpisodeRow
        episode={episode({ overview: '' })}
        watched={false}
        watchedAt={null}
        watchedAtUnknown={false}
        onToggleWatched={vi.fn()}
        onMarkWatchedWithDate={vi.fn()}
      />,
    )
    expect(screen.getByText('No synopsis available.')).toBeInTheDocument()
  })

  it('renders the runtime badge when present, and omits it when null', () => {
    const { rerender } = render(
      <EpisodeRow
        episode={episode({ runtime: 55 })}
        watched={false}
        watchedAt={null}
        watchedAtUnknown={false}
        onToggleWatched={vi.fn()}
        onMarkWatchedWithDate={vi.fn()}
      />,
    )
    expect(screen.getByText('55m')).toBeInTheDocument()

    rerender(
      <EpisodeRow
        episode={episode({ runtime: null })}
        watched={false}
        watchedAt={null}
        watchedAtUnknown={false}
        onToggleWatched={vi.fn()}
        onMarkWatchedWithDate={vi.fn()}
      />,
    )
    expect(screen.queryByText(/m$/)).not.toBeInTheDocument()
  })
})

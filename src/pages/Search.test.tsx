import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../lib/tmdb', () => ({
  searchShows: vi.fn(),
  getTrendingShows: vi.fn(),
  getTvGenres: vi.fn(),
  isTmdbConfigured: true,
}))
vi.mock('../hooks/useStreamingPlatforms', () => ({ useStreamingPlatforms: vi.fn() }))
vi.mock('../components/ShowCard', () => ({
  default: ({ show }: { show: { id: number; name: string } }) => <div>{show.name}</div>,
}))

import { searchShows, getTrendingShows, getTvGenres } from '../lib/tmdb'
import { useStreamingPlatforms } from '../hooks/useStreamingPlatforms'
import Search from './Search'
import type { TmdbShowSummary } from '../types'
import type { ResolvedProvider } from '../lib/streamingProvider'

function show(overrides: Partial<TmdbShowSummary> = {}): TmdbShowSummary {
  return {
    id: 1,
    name: 'Show One',
    poster_path: '/poster.jpg',
    first_air_date: '2020-01-01',
    vote_average: 8,
    ...overrides,
  }
}

/** Makes the platforms hook resolve per-id from a fixed map, regardless of which id batch asks. */
function mockPlatforms(entries: [number, ResolvedProvider][]) {
  const byId = new Map(entries)
  vi.mocked(useStreamingPlatforms).mockImplementation((ids: number[]) => ({
    platforms: new Map(ids.map((id) => [id, byId.get(id) ?? null])),
    loading: false,
  }))
}

beforeEach(() => {
  vi.mocked(searchShows).mockReset().mockResolvedValue([])
  vi.mocked(getTrendingShows).mockReset().mockResolvedValue([])
  vi.mocked(getTvGenres).mockReset().mockResolvedValue([
    { id: 18, name: 'Drama' },
    { id: 35, name: 'Comedy' },
  ])
  vi.mocked(useStreamingPlatforms).mockReset().mockReturnValue({ platforms: new Map(), loading: false })
})

describe('Search', () => {
  it('shows an initial prompt before any search', () => {
    render(<Search />)
    expect(screen.getByText(/Search for any TV show/)).toBeInTheDocument()
  })

  it('does not search for an empty query', () => {
    render(<Search />)
    fireEvent.change(screen.getByPlaceholderText('Search for a TV show…'), { target: { value: '   ' } })
    expect(searchShows).not.toHaveBeenCalled()
  })

  it('debounces and searches for a typed query', async () => {
    vi.mocked(searchShows).mockResolvedValue([show()])
    render(<Search />)
    fireEvent.change(screen.getByPlaceholderText('Search for a TV show…'), { target: { value: 'star trek' } })
    await waitFor(() => expect(searchShows).toHaveBeenCalledWith('star trek'))
    await waitFor(() => expect(screen.getByText('Show One')).toBeInTheDocument())
  })

  it('filters out results with no poster', async () => {
    vi.mocked(searchShows).mockResolvedValue([show({ id: 1, name: 'Has Poster' }), show({ id: 2, name: 'No Poster', poster_path: null })])
    render(<Search />)
    fireEvent.change(screen.getByPlaceholderText('Search for a TV show…'), { target: { value: 'query' } })
    await waitFor(() => expect(screen.getByText('Has Poster')).toBeInTheDocument())
    expect(screen.queryByText('No Poster')).not.toBeInTheDocument()
  })

  it('shows a no-results message after an empty search', async () => {
    render(<Search />)
    fireEvent.change(screen.getByPlaceholderText('Search for a TV show…'), { target: { value: 'nothing' } })
    await waitFor(() => expect(screen.getByText(/No shows found for/)).toBeInTheDocument())
  })

  it('shows an error message when the search fails', async () => {
    vi.mocked(searchShows).mockRejectedValue(new Error('search failed'))
    render(<Search />)
    fireEvent.change(screen.getByPlaceholderText('Search for a TV show…'), { target: { value: 'query' } })
    await waitFor(() => expect(screen.getByText('search failed')).toBeInTheDocument())
  })

  it('clears results when the query is cleared', async () => {
    vi.mocked(searchShows).mockResolvedValue([show()])
    render(<Search />)
    const input = screen.getByPlaceholderText('Search for a TV show…')
    fireEvent.change(input, { target: { value: 'star trek' } })
    await waitFor(() => expect(screen.getByText('Show One')).toBeInTheDocument())
    fireEvent.change(input, { target: { value: '' } })
    await waitFor(() => expect(screen.queryByText('Show One')).not.toBeInTheDocument())
  })

  it('offers trending shows to browse before any search', async () => {
    vi.mocked(getTrendingShows).mockResolvedValue([show({ id: 9, name: 'Trending Show' })])
    render(<Search />)
    await waitFor(() => expect(screen.getByText('Trending this week')).toBeInTheDocument())
    expect(screen.getByText('Trending Show')).toBeInTheDocument()
  })

  it('does not show a trending section while there are no trending shows yet', () => {
    render(<Search />)
    expect(screen.queryByText('Trending this week')).not.toBeInTheDocument()
  })

  it('hides trending shows once the person starts typing a query', async () => {
    vi.mocked(getTrendingShows).mockResolvedValue([show({ id: 9, name: 'Trending Show' })])
    vi.mocked(searchShows).mockResolvedValue([show({ id: 1, name: 'Star Trek' })])
    render(<Search />)
    await waitFor(() => expect(screen.getByText('Trending Show')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('Search for a TV show…'), { target: { value: 'star trek' } })
    await waitFor(() => expect(screen.getByText('Star Trek')).toBeInTheDocument())
    expect(screen.queryByText('Trending Show')).not.toBeInTheDocument()
  })

  it('does not show the Filters trigger when trending has no resolvable genre or platform facets', async () => {
    vi.mocked(getTrendingShows).mockResolvedValue([show({ id: 9, name: 'Trending Show', genre_ids: [] })])
    render(<Search />)
    await waitFor(() => expect(screen.getByText('Trending Show')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /Filters/ })).not.toBeInTheDocument()
  })

  it('shows the Filters trigger once trending has genre/platform facets, and filters by genre', async () => {
    vi.mocked(getTrendingShows).mockResolvedValue([
      show({ id: 1, name: 'Drama Show', genre_ids: [18] }),
      show({ id: 2, name: 'Comedy Show', genre_ids: [35] }),
    ])
    render(<Search />)
    await waitFor(() => expect(screen.getByText('Drama Show')).toBeInTheDocument())

    const trigger = screen.getByRole('button', { name: 'Filters' })
    fireEvent.click(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Filters' })
    fireEvent.click(within(dialog).getByText('Drama'))

    await waitFor(() => expect(screen.queryByText('Comedy Show')).not.toBeInTheDocument())
    expect(screen.getByText('Drama Show')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Filters · 1' })).toBeInTheDocument()
  })

  it('filters trending shows by streaming platform', async () => {
    vi.mocked(getTrendingShows).mockResolvedValue([
      show({ id: 1, name: 'Netflix Show', genre_ids: [18] }),
      show({ id: 2, name: 'Hulu Show', genre_ids: [18] }),
    ])
    mockPlatforms([
      [1, { provider_name: 'Netflix', logo_path: null }],
      [2, { provider_name: 'Hulu', logo_path: null }],
    ])
    render(<Search />)
    await waitFor(() => expect(screen.getByText('Netflix Show')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    const dialog = await screen.findByRole('dialog', { name: 'Filters' })
    fireEvent.click(within(dialog).getByText('Netflix'))

    await waitFor(() => expect(screen.queryByText('Hulu Show')).not.toBeInTheDocument())
    expect(screen.getByText('Netflix Show')).toBeInTheDocument()
  })

  it('counts genre and platform as independent facets in the Filters label, not by chip count', async () => {
    vi.mocked(getTrendingShows).mockResolvedValue([
      show({ id: 1, name: 'Drama Netflix Show', genre_ids: [18, 35] }),
    ])
    mockPlatforms([[1, { provider_name: 'Netflix', logo_path: null }]])
    render(<Search />)
    await waitFor(() => expect(screen.getByText('Drama Netflix Show')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    const dialog = await screen.findByRole('dialog', { name: 'Filters' })
    fireEvent.click(within(dialog).getByText('Drama'))
    fireEvent.click(within(dialog).getByText('Comedy'))
    fireEvent.click(within(dialog).getByText('Netflix'))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Filters · 2' })).toBeInTheDocument())
  })

  it('shows a filtered-empty message, and Clear restores the full trending list', async () => {
    vi.mocked(getTrendingShows).mockResolvedValue([
      show({ id: 1, name: 'Drama Show', genre_ids: [18] }),
      show({ id: 2, name: 'Hulu Comedy Show', genre_ids: [35] }),
    ])
    mockPlatforms([[2, { provider_name: 'Hulu', logo_path: null }]])
    render(<Search />)
    await waitFor(() => expect(screen.getByText('Drama Show')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    let dialog = await screen.findByRole('dialog', { name: 'Filters' })
    fireEvent.click(within(dialog).getByText('Drama'))
    fireEvent.click(within(dialog).getByText('Hulu'))

    await waitFor(() => expect(screen.getByText('No trending shows match the selected filters.')).toBeInTheDocument())
    expect(screen.queryByText('Drama Show')).not.toBeInTheDocument()
    expect(screen.queryByText('Hulu Comedy Show')).not.toBeInTheDocument()

    dialog = screen.getByRole('dialog', { name: 'Filters' })
    fireEvent.click(within(dialog).getByText('Clear'))
    await waitFor(() => expect(screen.getByText('Drama Show')).toBeInTheDocument())
    expect(screen.getByText('Hulu Comedy Show')).toBeInTheDocument()
  })

  it('closes the Filters dropdown on an outside pointerdown', async () => {
    vi.mocked(getTrendingShows).mockResolvedValue([show({ id: 1, name: 'Drama Show', genre_ids: [18] })])
    render(<Search />)
    await waitFor(() => expect(screen.getByText('Drama Show')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    await screen.findByRole('dialog', { name: 'Filters' })
    fireEvent.pointerDown(document.body)
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Filters' })).not.toBeInTheDocument())
  })

  it('applies an active genre filter to live search results as well', async () => {
    vi.mocked(getTrendingShows).mockResolvedValue([show({ id: 1, name: 'Drama Show', genre_ids: [18] })])
    render(<Search />)
    await waitFor(() => expect(screen.getByText('Drama Show')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    const dialog = await screen.findByRole('dialog', { name: 'Filters' })
    fireEvent.click(within(dialog).getByText('Drama'))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Filters · 1' })).toBeInTheDocument())

    vi.mocked(searchShows).mockResolvedValue([
      show({ id: 2, name: 'Drama Result', genre_ids: [18] }),
      show({ id: 3, name: 'Comedy Result', genre_ids: [35] }),
    ])
    fireEvent.change(screen.getByPlaceholderText('Search for a TV show…'), { target: { value: 'query' } })
    await waitFor(() => expect(screen.getByText('Drama Result')).toBeInTheDocument())
    expect(screen.queryByText('Comedy Result')).not.toBeInTheDocument()
  })
})

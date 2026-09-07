import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../lib/tmdb', () => ({ searchShows: vi.fn(), isTmdbConfigured: true }))
vi.mock('../hooks/useStreamingPlatforms', () => ({ useStreamingPlatforms: vi.fn() }))
vi.mock('../components/ShowCard', () => ({
  default: ({ show }: { show: { id: number; name: string } }) => <div>{show.name}</div>,
}))

import { searchShows } from '../lib/tmdb'
import { useStreamingPlatforms } from '../hooks/useStreamingPlatforms'
import Search from './Search'
import type { TmdbShowSummary } from '../types'

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

beforeEach(() => {
  vi.mocked(searchShows).mockReset().mockResolvedValue([])
  vi.mocked(useStreamingPlatforms).mockReturnValue({ platforms: new Map(), loading: false })
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
})

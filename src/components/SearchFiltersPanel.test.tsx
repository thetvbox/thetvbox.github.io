import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)

import SearchFiltersPanel from './SearchFiltersPanel'
import { emptySearchFilters } from '../lib/searchFilters'
import type { SearchFilterFacets, SearchFilters } from '../lib/searchFilters'

function facets(overrides: Partial<SearchFilterFacets> = {}): SearchFilterFacets {
  return {
    genres: [],
    platforms: [],
    ...overrides,
  }
}

describe('SearchFiltersPanel', () => {
  it('renders both facets as separate sections at once, with no category switch needed', () => {
    render(
      <SearchFiltersPanel
        facets={facets({ platforms: ['Netflix', 'Hulu'], genres: ['Drama', 'Comedy'] })}
        filters={emptySearchFilters()}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('Netflix')).toBeInTheDocument()
    expect(screen.getByText('Hulu')).toBeInTheDocument()
    expect(screen.getByText('Drama')).toBeInTheDocument()
    expect(screen.getByText('Comedy')).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })

  it('reflects the active filters via aria-pressed on each chip, across both sections at once', () => {
    const filters: SearchFilters = {
      genres: new Set(['Drama']),
      platforms: new Set(['Netflix']),
    }
    render(
      <SearchFiltersPanel
        facets={facets({ platforms: ['Netflix', 'Hulu'], genres: ['Drama', 'Comedy'] })}
        filters={filters}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('Netflix')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Hulu')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('Drama')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Comedy')).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking an inactive platform chip adds it, leaving genres untouched', () => {
    const onChange = vi.fn()
    const filters: SearchFilters = {
      genres: new Set(['Drama']),
      platforms: new Set(),
    }
    render(
      <SearchFiltersPanel
        facets={facets({ platforms: ['Netflix'], genres: ['Drama'] })}
        filters={filters}
        onChange={onChange}
        onClose={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Netflix'))
    expect(onChange).toHaveBeenCalledWith({
      genres: new Set(['Drama']),
      platforms: new Set(['Netflix']),
    })
  })

  it('clicking an inactive genre chip adds it, leaving platforms untouched', () => {
    const onChange = vi.fn()
    const filters: SearchFilters = {
      genres: new Set(),
      platforms: new Set(['Netflix']),
    }
    render(
      <SearchFiltersPanel
        facets={facets({ platforms: ['Netflix'], genres: ['Drama'] })}
        filters={filters}
        onChange={onChange}
        onClose={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Drama'))
    expect(onChange).toHaveBeenCalledWith({
      genres: new Set(['Drama']),
      platforms: new Set(['Netflix']),
    })
  })

  it('clicking an active platform chip removes it', () => {
    const onChange = vi.fn()
    const filters: SearchFilters = {
      genres: new Set(),
      platforms: new Set(['Netflix', 'Hulu']),
    }
    render(
      <SearchFiltersPanel
        facets={facets({ platforms: ['Netflix', 'Hulu'] })}
        filters={filters}
        onChange={onChange}
        onClose={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Netflix'))
    expect(onChange).toHaveBeenCalledWith({
      genres: new Set(),
      platforms: new Set(['Hulu']),
    })
  })

  it('clicking an active genre chip removes it', () => {
    const onChange = vi.fn()
    const filters: SearchFilters = {
      genres: new Set(['Drama', 'Comedy']),
      platforms: new Set(),
    }
    render(
      <SearchFiltersPanel
        facets={facets({ genres: ['Drama', 'Comedy'] })}
        filters={filters}
        onChange={onChange}
        onClose={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Comedy'))
    expect(onChange).toHaveBeenCalledWith({
      genres: new Set(['Drama']),
      platforms: new Set(),
    })
  })

  it('does not render a Clear all button when no filters are active', () => {
    render(
      <SearchFiltersPanel
        facets={facets({ platforms: ['Netflix'], genres: ['Drama'] })}
        filters={emptySearchFilters()}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.queryByText('Clear all')).not.toBeInTheDocument()
  })

  it('renders a Clear all button when a filter is active, and it resets both facets', () => {
    const onChange = vi.fn()
    const filters: SearchFilters = {
      genres: new Set(['Drama']),
      platforms: new Set(),
    }
    render(
      <SearchFiltersPanel
        facets={facets({ platforms: ['Netflix'], genres: ['Drama'] })}
        filters={filters}
        onChange={onChange}
        onClose={vi.fn()}
      />,
    )
    const clearButton = screen.getByText('Clear all')
    expect(clearButton).toBeInTheDocument()
    fireEvent.click(clearButton)
    expect(onChange).toHaveBeenCalledTimes(1)
    const arg = onChange.mock.calls[0][0] as SearchFilters
    expect(arg.genres.size).toBe(0)
    expect(arg.platforms.size).toBe(0)
  })

  it('renders a Clear all button when only platforms are active', () => {
    const filters: SearchFilters = {
      genres: new Set(),
      platforms: new Set(['Netflix']),
    }
    render(
      <SearchFiltersPanel
        facets={facets({ platforms: ['Netflix'] })}
        filters={filters}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('Clear all')).toBeInTheDocument()
  })

  it('omits the Platform section when facets.platforms is empty', () => {
    render(
      <SearchFiltersPanel
        facets={facets({ platforms: [], genres: ['Drama'] })}
        filters={emptySearchFilters()}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.queryByText('Platform')).not.toBeInTheDocument()
    expect(screen.getByText('Genre')).toBeInTheDocument()
  })

  it('omits the Genre section when facets.genres is empty', () => {
    render(
      <SearchFiltersPanel
        facets={facets({ platforms: ['Netflix'], genres: [] })}
        filters={emptySearchFilters()}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.queryByText('Genre')).not.toBeInTheDocument()
    expect(screen.getByText('Platform')).toBeInTheDocument()
  })

  it("shows each chip's live count, and disables an unselected option at zero without hiding it", () => {
    render(
      <SearchFiltersPanel
        facets={facets({ platforms: ['Netflix', 'Hulu'], genres: ['Drama'] })}
        filters={emptySearchFilters()}
        counts={{
          platforms: new Map([['Netflix', 3], ['Hulu', 0]]),
          genres: new Map([['Drama', 2]]),
        }}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('· 3')).toBeInTheDocument()
    expect(screen.getByText('· 2')).toBeInTheDocument()
    expect(screen.getByText('· 0')).toBeInTheDocument()
    expect(screen.getByText('Hulu').closest('button')).toBeDisabled()
    expect(screen.getByText('Netflix').closest('button')).not.toBeDisabled()
  })

  it("keeps an already-selected option clickable even at zero count, so it can still be cleared", () => {
    const onChange = vi.fn()
    render(
      <SearchFiltersPanel
        facets={facets({ platforms: ['Hulu'] })}
        filters={{ genres: new Set(), platforms: new Set(['Hulu']) }}
        counts={{ platforms: new Map([['Hulu', 0]]), genres: new Map() }}
        onChange={onChange}
        onClose={vi.fn()}
      />,
    )
    const hulu = screen.getByText('Hulu').closest('button') as HTMLButtonElement
    expect(hulu).not.toBeDisabled()
    fireEvent.click(hulu)
    expect(onChange).toHaveBeenCalledWith({ genres: new Set(), platforms: new Set() })
  })

  it('wires onClose through to the underlying BottomSheet (Escape closes it)', () => {
    const onClose = vi.fn()
    render(
      <SearchFiltersPanel facets={facets()} filters={emptySearchFilters()} onChange={vi.fn()} onClose={onClose} />,
    )
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

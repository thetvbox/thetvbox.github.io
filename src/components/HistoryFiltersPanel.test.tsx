import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import HistoryFiltersPanel from './HistoryFiltersPanel'
import { emptyHistoryFilters } from '../lib/historyFilters'
import type { HistoryFilterFacets } from '../lib/historyFilters'

function facets(overrides: Partial<HistoryFilterFacets> = {}): HistoryFilterFacets {
  return {
    genres: [],
    minYear: null,
    maxYear: null,
    countries: [],
    languages: [],
    platforms: [],
    statuses: [],
    ...overrides,
  }
}

describe('HistoryFiltersPanel', () => {
  it('always renders the Rating section', () => {
    render(
      <HistoryFiltersPanel facets={facets()} filters={emptyHistoryFilters()} onChange={vi.fn()} loadingDetails={false} onClose={vi.fn()} />,
    )
    expect(screen.getByText('Rating')).toBeInTheDocument()
    expect(screen.getByText('Rated')).toBeInTheDocument()
  })

  it('hides facet sections with no options', () => {
    render(
      <HistoryFiltersPanel facets={facets()} filters={emptyHistoryFilters()} onChange={vi.fn()} loadingDetails={false} onClose={vi.fn()} />,
    )
    expect(screen.queryByText('Genre')).not.toBeInTheDocument()
    expect(screen.queryByText('Platform')).not.toBeInTheDocument()
  })

  it('shows genre chips when facets provide them', () => {
    render(
      <HistoryFiltersPanel
        facets={facets({ genres: ['Drama', 'Comedy'] })}
        filters={emptyHistoryFilters()}
        onChange={vi.fn()}
        loadingDetails={false}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('Comedy')).toBeInTheDocument()
    expect(screen.getByText('Drama')).toBeInTheDocument()
  })

  it('toggling a genre chip adds it to the filter set', () => {
    const onChange = vi.fn()
    render(
      <HistoryFiltersPanel
        facets={facets({ genres: ['Drama'] })}
        filters={emptyHistoryFilters()}
        onChange={onChange}
        loadingDetails={false}
        onClose={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Drama'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ genres: new Set(['Drama']) }))
  })

  it('selecting Rated reveals the minimum-rating chips', () => {
    render(
      <HistoryFiltersPanel facets={facets()} filters={emptyHistoryFilters()} onChange={vi.fn()} loadingDetails={false} onClose={vi.fn()} />,
    )
    expect(screen.queryByText('4+★')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Rated'))
  })

  it('shows the minimum-rating chips when filters.rated is already "rated"', () => {
    render(
      <HistoryFiltersPanel
        facets={facets()}
        filters={{ ...emptyHistoryFilters(), rated: 'rated' }}
        onChange={vi.fn()}
        loadingDetails={false}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('4+★')).toBeInTheDocument()
  })

  it('shows a Clear all button only when filters are active', () => {
    const { rerender } = render(
      <HistoryFiltersPanel facets={facets()} filters={emptyHistoryFilters()} onChange={vi.fn()} loadingDetails={false} onClose={vi.fn()} />,
    )
    expect(screen.queryByText('Clear all')).not.toBeInTheDocument()
    rerender(
      <HistoryFiltersPanel
        facets={facets()}
        filters={{ ...emptyHistoryFilters(), rated: 'rated' }}
        onChange={vi.fn()}
        loadingDetails={false}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('Clear all')).toBeInTheDocument()
  })

  it('Clear all resets filters to empty', () => {
    const onChange = vi.fn()
    render(
      <HistoryFiltersPanel
        facets={facets()}
        filters={{ ...emptyHistoryFilters(), rated: 'rated' }}
        onChange={onChange}
        loadingDetails={false}
        onClose={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Clear all'))
    expect(onChange).toHaveBeenCalledWith(emptyHistoryFilters())
  })

  it('calls onClose when Close is clicked, and on Escape', () => {
    const onClose = vi.fn()
    render(
      <HistoryFiltersPanel facets={facets()} filters={emptyHistoryFilters()} onChange={vi.fn()} loadingDetails={false} onClose={onClose} />,
    )
    fireEvent.click(screen.getByText('Close'))
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('shows a loading hint for filter details when loadingDetails is true', () => {
    render(
      <HistoryFiltersPanel facets={facets()} filters={emptyHistoryFilters()} onChange={vi.fn()} loadingDetails onClose={vi.fn()} />,
    )
    expect(screen.getByText('Loading more filter options…')).toBeInTheDocument()
  })

  it('renders a year range input when minYear/maxYear are set, and commits after a debounce', () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    render(
      <HistoryFiltersPanel
        facets={facets({ minYear: 2000, maxYear: 2026 })}
        filters={emptyHistoryFilters()}
        onChange={onChange}
        loadingDetails={false}
        onClose={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByLabelText('From year'), { target: { value: '2010' } })
    expect(onChange).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ yearFrom: 2010, yearTo: null }))
    vi.useRealTimers()
  })
})

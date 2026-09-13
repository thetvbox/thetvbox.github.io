import { describe, expect, it } from 'vitest'
import {
  buildSearchFilterFacets,
  countActiveSearchFilters,
  emptySearchFilters,
  filterShows,
  isSearchFiltersActive,
  pruneSearchFilters,
} from './searchFilters'
import type { ResolvedProvider } from './streamingProvider'
import type { TmdbShowSummary } from '../types'

function show(overrides: Partial<TmdbShowSummary> = {}): TmdbShowSummary {
  return {
    id: 1,
    name: 'Show One',
    poster_path: '/p.jpg',
    first_air_date: '2020-01-01',
    vote_average: 8,
    genre_ids: [18],
    ...overrides,
  }
}

const genreNames = new Map([
  [18, 'Drama'],
  [35, 'Comedy'],
])

describe('emptySearchFilters / countActiveSearchFilters / isSearchFiltersActive', () => {
  it('starts with no active facets', () => {
    const f = emptySearchFilters()
    expect(countActiveSearchFilters(f)).toBe(0)
    expect(isSearchFiltersActive(f)).toBe(false)
  })

  it('counts genre and platform as independent facets, not by chip count', () => {
    const f = { genres: new Set(['Drama', 'Comedy']), platforms: new Set(['Netflix']) }
    expect(countActiveSearchFilters(f)).toBe(2)
    expect(isSearchFiltersActive(f)).toBe(true)
  })
})

describe('buildSearchFilterFacets', () => {
  it('collects distinct, sorted genre names (via the id map) and platform names', () => {
    const shows = [
      show({ id: 1, genre_ids: [18] }),
      show({ id: 2, genre_ids: [35] }),
      show({ id: 3, genre_ids: [18, 35] }),
    ]
    const platforms = new Map<number, ResolvedProvider | null>([
      [1, { provider_name: 'Netflix', logo_path: null }],
      [2, { provider_name: 'Hulu', logo_path: null }],
      [3, null],
    ])

    const facets = buildSearchFilterFacets(shows, genreNames, platforms)

    expect(facets.genres).toEqual(['Comedy', 'Drama'])
    expect(facets.platforms).toEqual(['Hulu', 'Netflix'])
  })

  it('skips genre ids with no matching name and shows with no resolved platform', () => {
    const facets = buildSearchFilterFacets([show({ id: 1, genre_ids: [999] })], genreNames, new Map())
    expect(facets.genres).toEqual([])
    expect(facets.platforms).toEqual([])
  })
})

describe('filterShows', () => {
  const shows = [
    show({ id: 1, genre_ids: [18] }),
    show({ id: 2, genre_ids: [35] }),
  ]
  const platforms = new Map<number, ResolvedProvider | null>([
    [1, { provider_name: 'Netflix', logo_path: null }],
    [2, { provider_name: 'Hulu', logo_path: null }],
  ])

  it('returns the full list unchanged when no filters are active', () => {
    expect(filterShows(shows, emptySearchFilters(), genreNames, platforms)).toEqual(shows)
  })

  it('filters by genre', () => {
    const result = filterShows(shows, { genres: new Set(['Comedy']), platforms: new Set() }, genreNames, platforms)
    expect(result.map((s) => s.id)).toEqual([2])
  })

  it('filters by platform, excluding shows with no resolved provider', () => {
    const result = filterShows(
      shows,
      { genres: new Set(), platforms: new Set(['Netflix']) },
      genreNames,
      new Map([[1, { provider_name: 'Netflix', logo_path: null }]]),
    )
    expect(result.map((s) => s.id)).toEqual([1])
  })

  it('combines genre and platform with AND semantics', () => {
    const result = filterShows(
      shows,
      { genres: new Set(['Drama']), platforms: new Set(['Hulu']) },
      genreNames,
      platforms,
    )
    expect(result).toEqual([])
  })

  it('treats a missing genre_ids array as no genres', () => {
    const result = filterShows(
      [show({ id: 1, genre_ids: undefined })],
      { genres: new Set(['Drama']), platforms: new Set() },
      genreNames,
      platforms,
    )
    expect(result).toEqual([])
  })
})

describe('pruneSearchFilters', () => {
  it('drops selections no longer present in the current facets', () => {
    const filters = { genres: new Set(['Drama', 'Comedy']), platforms: new Set(['Netflix', 'Hulu']) }
    const pruned = pruneSearchFilters(filters, { genres: ['Drama'], platforms: ['Netflix'] })
    expect(pruned.genres).toEqual(new Set(['Drama']))
    expect(pruned.platforms).toEqual(new Set(['Netflix']))
  })

  it('returns the same object when nothing needed pruning', () => {
    const filters = { genres: new Set(['Drama']), platforms: new Set<string>() }
    const pruned = pruneSearchFilters(filters, { genres: ['Drama', 'Comedy'], platforms: [] })
    expect(pruned).toBe(filters)
  })
})

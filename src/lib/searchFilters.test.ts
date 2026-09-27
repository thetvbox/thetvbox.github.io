import { describe, expect, it } from 'vitest'
import {
  buildSearchFilterFacets,
  countActiveSearchFilters,
  countSearchFilterOptions,
  emptySearchFilters,
  filterShows,
  isSearchFiltersActive,
  isSearchResultPending,
  pruneSearchFilters,
} from './searchFilters'
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
    const platformNames = new Map<number, Set<string>>([
      [1, new Set(['Netflix'])],
      [2, new Set(['Hulu'])],
      [3, new Set()],
    ])

    const facets = buildSearchFilterFacets(shows, genreNames, platformNames)

    expect(facets.genres).toEqual(['Comedy', 'Drama'])
    expect(facets.platforms).toEqual(['Hulu', 'Netflix'])
  })

  it('collects every service a show streams on, not just one per show', () => {
    const shows = [show({ id: 1 })]
    const platformNames = new Map([[1, new Set(['Netflix', 'Hulu'])]])

    const facets = buildSearchFilterFacets(shows, genreNames, platformNames)

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
  const platformNames = new Map([
    [1, new Set(['Netflix'])],
    [2, new Set(['Hulu'])],
  ])

  it('returns the full list unchanged when no filters are active', () => {
    expect(filterShows(shows, emptySearchFilters(), genreNames, platformNames)).toEqual(shows)
  })

  it('filters by genre', () => {
    const result = filterShows(shows, { genres: new Set(['Comedy']), platforms: new Set() }, genreNames, platformNames)
    expect(result.map((s) => s.id)).toEqual([2])
  })

  it('filters by platform, excluding shows with no resolved provider', () => {
    const result = filterShows(
      shows,
      { genres: new Set(), platforms: new Set(['Netflix']) },
      genreNames,
      new Map([[1, new Set(['Netflix'])]]),
    )
    expect(result.map((s) => s.id)).toEqual([1])
  })

  it('matches a show that streams on the wanted platform alongside others, not just a show whose sole platform is it', () => {
    const result = filterShows(
      [show({ id: 1 })],
      { genres: new Set(), platforms: new Set(['Netflix']) },
      genreNames,
      new Map([[1, new Set(['Apple TV+', 'Netflix'])]]),
    )
    expect(result.map((s) => s.id)).toEqual([1])
  })

  it('combines genre and platform with AND semantics', () => {
    const result = filterShows(
      shows,
      { genres: new Set(['Drama']), platforms: new Set(['Hulu']) },
      genreNames,
      platformNames,
    )
    expect(result).toEqual([])
  })

  it('treats a missing genre_ids array as no genres', () => {
    const result = filterShows(
      [show({ id: 1, genre_ids: undefined })],
      { genres: new Set(['Drama']), platforms: new Set() },
      genreNames,
      platformNames,
    )
    expect(result).toEqual([])
  })
})

describe('isSearchResultPending', () => {
  it('is true only while actively searching and results have not landed yet', () => {
    expect(isSearchResultPending(true, false)).toBe(true)
    expect(isSearchResultPending(true, true)).toBe(false)
    expect(isSearchResultPending(false, false)).toBe(false)
    expect(isSearchResultPending(false, true)).toBe(false)
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

describe('countSearchFilterOptions', () => {
  const platformNames = new Map([
    [1, new Set(['Netflix'])],
    [2, new Set(['Hulu'])],
  ])
  const shows = [
    show({ id: 1, name: 'Drama Netflix Show', genre_ids: [18] }),
    show({ id: 2, name: 'Comedy Hulu Show', genre_ids: [35] }),
  ]
  const facets = buildSearchFilterFacets(shows, genreNames, platformNames)

  it('gives every facet option an explicit count, including zero, rather than omitting it', () => {
    const counts = countSearchFilterOptions(shows, emptySearchFilters(), facets, genreNames, platformNames)
    expect(counts.genres.get('Drama')).toBe(1)
    expect(counts.genres.get('Comedy')).toBe(1)
    expect(counts.platforms.get('Netflix')).toBe(1)
    expect(counts.platforms.get('Hulu')).toBe(1)
  })

  it("combines a genre option's count with the OTHER facet's (platform) current selection", () => {
    const filters = { genres: new Set<string>(), platforms: new Set(['Netflix']) }
    const counts = countSearchFilterOptions(shows, filters, facets, genreNames, platformNames)
    expect(counts.genres.get('Drama')).toBe(1) // Drama Netflix Show is on Netflix
    expect(counts.genres.get('Comedy')).toBe(0) // Comedy Hulu Show is not on Netflix
  })

  it("never lets one genre's own selection change another genre's own displayed count", () => {
    const filters = { genres: new Set(['Drama']), platforms: new Set<string>() }
    const counts = countSearchFilterOptions(shows, filters, facets, genreNames, platformNames)
    // Comedy's count is computed against the platform facet only, not against the already-selected Drama.
    expect(counts.genres.get('Comedy')).toBe(1)
  })

  it('is symmetric for platform options against the current genre selection', () => {
    const filters = { genres: new Set(['Drama']), platforms: new Set<string>() }
    const counts = countSearchFilterOptions(shows, filters, facets, genreNames, platformNames)
    expect(counts.platforms.get('Netflix')).toBe(1) // Drama Netflix Show matches Drama
    expect(counts.platforms.get('Hulu')).toBe(0) // Comedy Hulu Show doesn't match Drama
  })
})

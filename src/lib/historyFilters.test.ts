import { describe, expect, it } from 'vitest'
import {
  buildHistoryFilterFacets,
  countActiveHistoryFilters,
  emptyHistoryFilters,
  filterHistory,
  isHistoryFiltersActive,
} from './historyFilters'
import type { HistoryFilters } from './historyFilters'
import type { ShowActivity } from './showActivity'
import type { ResolvedProvider } from './streamingProvider'
import type { TmdbShowDetail } from '../types'

function activity(overrides: Partial<ShowActivity> = {}): ShowActivity {
  return {
    showId: 1,
    showName: 'Show One',
    showPosterPath: null,
    rating: null,
    ratedAt: null,
    watchedCount: 0,
    totalEpisodes: null,
    lastWatchedAt: null,
    lastWatchedAtUnknown: false,
    finished: false,
    finishedAt: null,
    finishedAtUnknown: false,
    started: false,
    startedAt: null,
    dismissed: false,
    dropped: false,
    droppedAt: null,
    ...overrides,
  }
}

function detail(overrides: Partial<TmdbShowDetail> = {}): TmdbShowDetail {
  return {
    id: 1,
    name: 'Show One',
    overview: '',
    poster_path: null,
    backdrop_path: null,
    first_air_date: '2020-05-01',
    genres: [{ id: 1, name: 'Drama' }],
    number_of_seasons: 1,
    number_of_episodes: 10,
    status: 'Ended',
    origin_country: ['US'],
    original_language: 'en',
    seasons: [],
    ...overrides,
  }
}

describe('emptyHistoryFilters / countActiveHistoryFilters / isHistoryFiltersActive', () => {
  it('starts with no active facets', () => {
    const f = emptyHistoryFilters()
    expect(countActiveHistoryFilters(f)).toBe(0)
    expect(isHistoryFiltersActive(f)).toBe(false)
  })

  it('counts yearFrom/yearTo as a single combined facet', () => {
    const f: HistoryFilters = { ...emptyHistoryFilters(), yearFrom: 2020, yearTo: 2022 }
    expect(countActiveHistoryFilters(f)).toBe(1)
  })

  it('counts each other active facet independently', () => {
    const f: HistoryFilters = {
      ...emptyHistoryFilters(),
      rated: 'rated',
      minRating: 3,
      genres: new Set(['Drama']),
      countries: new Set(['US']),
      languages: new Set(['en']),
      platforms: new Set(['Netflix']),
      statuses: new Set(['Ended']),
    }
    expect(countActiveHistoryFilters(f)).toBe(7)
    expect(isHistoryFiltersActive(f)).toBe(true)
  })
})

describe('buildHistoryFilterFacets', () => {
  it('collects distinct sorted genres/countries/languages/statuses/platforms and min/max year', () => {
    const shows = [
      activity({ showId: 1 }),
      activity({ showId: 2 }),
      activity({ showId: 3 }),
    ]
    const details = new Map([
      [1, detail({ id: 1, genres: [{ id: 1, name: 'Drama' }], first_air_date: '2018-01-01', origin_country: ['US'], original_language: 'en', status: 'Ended' })],
      [2, detail({ id: 2, genres: [{ id: 2, name: 'Comedy' }], first_air_date: '2022-01-01', origin_country: ['GB'], original_language: 'en', status: 'Returning Series' })],
    ])
    const platforms = new Map<number, ResolvedProvider | null>([
      [1, { provider_name: 'Netflix', logo_path: null }],
      [2, null],
    ])

    const facets = buildHistoryFilterFacets(shows, details, platforms)

    expect(facets.genres).toEqual(['Comedy', 'Drama'])
    expect(facets.countries).toEqual(['GB', 'US'])
    expect(facets.languages).toEqual(['en'])
    expect(facets.statuses).toEqual(['Ended', 'Returning Series'])
    expect(facets.platforms).toEqual(['Netflix'])
    expect(facets.minYear).toBe(2018)
    expect(facets.maxYear).toBe(2022)
  })

  it('returns null min/max year when no show has a usable first_air_date', () => {
    const shows = [activity({ showId: 1 })]
    const details = new Map([[1, detail({ id: 1, first_air_date: null })]])
    const facets = buildHistoryFilterFacets(shows, details, new Map())
    expect(facets.minYear).toBeNull()
    expect(facets.maxYear).toBeNull()
  })

  it('skips shows with no matching detail entry', () => {
    const shows = [activity({ showId: 99 })]
    const facets = buildHistoryFilterFacets(shows, new Map(), new Map())
    expect(facets.genres).toEqual([])
  })
})

describe('filterHistory', () => {
  const details = new Map([
    [1, detail({ id: 1, genres: [{ id: 1, name: 'Drama' }], first_air_date: '2018-06-01', origin_country: ['US'], original_language: 'en', status: 'Ended' })],
    [2, detail({ id: 2, genres: [{ id: 2, name: 'Comedy' }], first_air_date: '2022-03-01', origin_country: ['GB'], original_language: 'fr', status: 'Returning Series' })],
  ])
  const platforms = new Map<number, ResolvedProvider | null>([
    [1, { provider_name: 'Netflix', logo_path: null }],
    [2, { provider_name: 'Hulu', logo_path: null }],
  ])
  const shows = [
    activity({ showId: 1, rating: 4.5 }),
    activity({ showId: 2, rating: null }),
  ]

  it('returns the full list unchanged when no filters are active', () => {
    expect(filterHistory(shows, emptyHistoryFilters(), details, platforms)).toEqual(shows)
  })

  it('filters by rated/unrated', () => {
    const rated = filterHistory(shows, { ...emptyHistoryFilters(), rated: 'rated' }, details, platforms)
    expect(rated.map((s) => s.showId)).toEqual([1])

    const unrated = filterHistory(shows, { ...emptyHistoryFilters(), rated: 'unrated' }, details, platforms)
    expect(unrated.map((s) => s.showId)).toEqual([2])
  })

  it('filters by minRating, excluding unrated shows', () => {
    const result = filterHistory(shows, { ...emptyHistoryFilters(), minRating: 4 }, details, platforms)
    expect(result.map((s) => s.showId)).toEqual([1])
  })

  it('filters by genre', () => {
    const result = filterHistory(shows, { ...emptyHistoryFilters(), genres: new Set(['Comedy']) }, details, platforms)
    expect(result.map((s) => s.showId)).toEqual([2])
  })

  it('excludes shows with no detail when a genre filter is active', () => {
    const result = filterHistory(
      [activity({ showId: 42 })],
      { ...emptyHistoryFilters(), genres: new Set(['Drama']) },
      new Map(),
      new Map(),
    )
    expect(result).toEqual([])
  })

  it('filters by year range', () => {
    const result = filterHistory(shows, { ...emptyHistoryFilters(), yearFrom: 2020, yearTo: 2023 }, details, platforms)
    expect(result.map((s) => s.showId)).toEqual([2])
  })

  it('filters by country', () => {
    const result = filterHistory(shows, { ...emptyHistoryFilters(), countries: new Set(['GB']) }, details, platforms)
    expect(result.map((s) => s.showId)).toEqual([2])
  })

  it('filters by language', () => {
    const result = filterHistory(shows, { ...emptyHistoryFilters(), languages: new Set(['fr']) }, details, platforms)
    expect(result.map((s) => s.showId)).toEqual([2])
  })

  it('filters by status', () => {
    const result = filterHistory(shows, { ...emptyHistoryFilters(), statuses: new Set(['Ended']) }, details, platforms)
    expect(result.map((s) => s.showId)).toEqual([1])
  })

  it('filters by platform, excluding shows with no resolved provider', () => {
    const result = filterHistory(
      shows,
      { ...emptyHistoryFilters(), platforms: new Set(['Netflix']) },
      details,
      new Map([[1, { provider_name: 'Netflix', logo_path: null }]]),
    )
    expect(result.map((s) => s.showId)).toEqual([1])
  })

  it('combines multiple active facets with AND semantics', () => {
    const result = filterHistory(
      shows,
      { ...emptyHistoryFilters(), genres: new Set(['Drama']), countries: new Set(['GB']) },
      details,
      platforms,
    )
    expect(result).toEqual([])
  })
})

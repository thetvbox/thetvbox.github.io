import type { ShowActivity } from './showActivity'
import type { ResolvedProvider } from './streamingProvider'
import type { TmdbShowDetail } from '../types'

export interface HistoryFilters {
  rated: 'any' | 'rated' | 'unrated'
  /** Only meaningful when rated === 'rated' -- "at least N stars." */
  minRating: number | null
  genres: Set<string>
  yearFrom: number | null
  yearTo: number | null
  countries: Set<string>
  languages: Set<string>
  platforms: Set<string>
  statuses: Set<string>
}

export function emptyHistoryFilters(): HistoryFilters {
  return {
    rated: 'any',
    minRating: null,
    genres: new Set(),
    yearFrom: null,
    yearTo: null,
    countries: new Set(),
    languages: new Set(),
    platforms: new Set(),
    statuses: new Set(),
  }
}

export function isHistoryFiltersActive(filters: HistoryFilters): boolean {
  return countActiveHistoryFilters(filters) > 0
}

/** Powers the small "Filters · N" count badge on the toggle button. Year is
 * one combined facet (from/to) even though it's two fields internally. */
export function countActiveHistoryFilters(filters: HistoryFilters): number {
  let count = 0
  if (filters.rated !== 'any') count++
  if (filters.minRating !== null) count++
  if (filters.genres.size > 0) count++
  if (filters.yearFrom !== null || filters.yearTo !== null) count++
  if (filters.countries.size > 0) count++
  if (filters.languages.size > 0) count++
  if (filters.platforms.size > 0) count++
  if (filters.statuses.size > 0) count++
  return count
}

function firstAirYear(detail: TmdbShowDetail | undefined): number | null {
  if (!detail?.first_air_date) return null
  const year = Number(detail.first_air_date.slice(0, 4))
  return Number.isFinite(year) ? year : null
}

export interface HistoryFilterFacets {
  genres: string[]
  minYear: number | null
  maxYear: number | null
  countries: string[]
  languages: string[]
  platforms: string[]
  statuses: string[]
}

/** Built from the full, unfiltered list so chips stay stable while filtering. */
export function buildHistoryFilterFacets(
  activity: ShowActivity[],
  details: Map<number, TmdbShowDetail>,
  platforms: Map<number, ResolvedProvider | null>,
): HistoryFilterFacets {
  const genres = new Set<string>()
  const years: number[] = []
  const countries = new Set<string>()
  const languages = new Set<string>()
  const platformNames = new Set<string>()
  const statuses = new Set<string>()

  for (const s of activity) {
    const d = details.get(s.showId)
    if (d) {
      for (const g of d.genres ?? []) genres.add(g.name)
      const year = firstAirYear(d)
      if (year) years.push(year)
      for (const c of d.origin_country ?? []) countries.add(c)
      if (d.original_language) languages.add(d.original_language)
      if (d.status) statuses.add(d.status)
    }
    const p = platforms.get(s.showId)
    if (p) platformNames.add(p.provider_name)
  }

  return {
    genres: Array.from(genres).sort(),
    minYear: years.length > 0 ? Math.min(...years) : null,
    maxYear: years.length > 0 ? Math.max(...years) : null,
    countries: Array.from(countries).sort(),
    languages: Array.from(languages).sort(),
    platforms: Array.from(platformNames).sort(),
    statuses: Array.from(statuses).sort(),
  }
}

export function filterHistory(
  activity: ShowActivity[],
  filters: HistoryFilters,
  details: Map<number, TmdbShowDetail>,
  platforms: Map<number, ResolvedProvider | null>,
): ShowActivity[] {
  if (!isHistoryFiltersActive(filters)) return activity

  return activity.filter((s) => {
    if (filters.rated === 'rated' && s.rating === null) return false
    if (filters.rated === 'unrated' && s.rating !== null) return false
    if (filters.minRating !== null && (s.rating === null || s.rating < filters.minRating)) return false

    // Facets below need show details; a show still loading them can't match.
    const d = details.get(s.showId)

    if (filters.genres.size > 0 && !(d && d.genres?.some((g) => filters.genres.has(g.name)))) {
      return false
    }
    if (filters.yearFrom !== null || filters.yearTo !== null) {
      const year = firstAirYear(d)
      if (year === null) return false
      if (filters.yearFrom !== null && year < filters.yearFrom) return false
      if (filters.yearTo !== null && year > filters.yearTo) return false
    }
    if (filters.countries.size > 0 && !(d && d.origin_country?.some((c) => filters.countries.has(c)))) {
      return false
    }
    if (filters.languages.size > 0 && !(d && filters.languages.has(d.original_language))) {
      return false
    }
    if (filters.statuses.size > 0 && !(d && filters.statuses.has(d.status))) {
      return false
    }
    if (filters.platforms.size > 0) {
      const p = platforms.get(s.showId)
      if (!p || !filters.platforms.has(p.provider_name)) return false
    }

    return true
  })
}

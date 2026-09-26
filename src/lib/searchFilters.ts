import type { TmdbShowSummary } from '../types'

export interface SearchFilters {
  genres: Set<string>
  platforms: Set<string>
}

export function emptySearchFilters(): SearchFilters {
  return { genres: new Set(), platforms: new Set() }
}

export function isSearchFiltersActive(filters: SearchFilters): boolean {
  return countActiveSearchFilters(filters) > 0
}

/** Counts active filter facets (genre, platform), not the number of chips selected within each. */
export function countActiveSearchFilters(filters: SearchFilters): number {
  let count = 0
  if (filters.genres.size > 0) count++
  if (filters.platforms.size > 0) count++
  return count
}

export interface SearchFilterFacets {
  genres: string[]
  platforms: string[]
}

/** Built from the full, unfiltered list so chips stay stable while filtering. `platformNames` is every service each show streams on, not just its single "best guess" badge pick -- see resolveShowPlatformNames. */
export function buildSearchFilterFacets(
  shows: TmdbShowSummary[],
  genreNames: Map<number, string>,
  platformNames: Map<number, Set<string>>,
): SearchFilterFacets {
  const genres = new Set<string>()
  const platforms = new Set<string>()

  for (const s of shows) {
    for (const id of s.genre_ids ?? []) {
      const name = genreNames.get(id)
      if (name) genres.add(name)
    }
    for (const name of platformNames.get(s.id) ?? []) {
      platforms.add(name)
    }
  }

  return {
    genres: Array.from(genres).sort(),
    platforms: Array.from(platforms).sort(),
  }
}

export function filterShows(
  shows: TmdbShowSummary[],
  filters: SearchFilters,
  genreNames: Map<number, string>,
  platformNames: Map<number, Set<string>>,
): TmdbShowSummary[] {
  if (!isSearchFiltersActive(filters)) return shows

  return shows.filter((s) => {
    if (filters.genres.size > 0) {
      const matches = (s.genre_ids ?? []).some((id) => {
        const name = genreNames.get(id)
        return name !== undefined && filters.genres.has(name)
      })
      if (!matches) return false
    }
    if (filters.platforms.size > 0) {
      const names = platformNames.get(s.id)
      const matches = names && Array.from(filters.platforms).some((wanted) => names.has(wanted))
      if (!matches) return false
    }
    return true
  })
}

/** True while a just-typed query's results haven't landed yet, so facets/filters would momentarily look empty. */
export function isSearchResultPending(searching: boolean, hasSearched: boolean): boolean {
  return searching && !hasSearched
}

/** Drops selections that no longer appear in the current facet list, e.g. after switching from trending to search results. */
export function pruneSearchFilters(filters: SearchFilters, facets: SearchFilterFacets): SearchFilters {
  const genres = new Set(Array.from(filters.genres).filter((g) => facets.genres.includes(g)))
  const platforms = new Set(Array.from(filters.platforms).filter((p) => facets.platforms.includes(p)))
  if (genres.size === filters.genres.size && platforms.size === filters.platforms.size) return filters
  return { genres, platforms }
}

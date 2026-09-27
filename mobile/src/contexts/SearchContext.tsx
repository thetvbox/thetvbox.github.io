import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { useStreamingPlatforms } from '@/hooks/useStreamingPlatforms'
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants'
import { errorMessage } from '@/lib/format'
import {
  buildSearchFilterFacets,
  countSearchFilterOptions,
  emptySearchFilters,
  filterShows,
  isSearchFiltersActive,
  isSearchResultPending,
  pruneSearchFilters,
} from '@/lib/searchFilters'
import type { SearchFilterCounts, SearchFilterFacets, SearchFilters } from '@/lib/searchFilters'
import { getTrendingShows, getTvGenres, isTmdbConfigured, searchShows } from '@/lib/tmdb'
import type { ResolvedProvider } from '@/lib/streamingProvider'
import type { TmdbShowSummary } from '@/types'

interface SearchContextValue {
  query: string
  setQuery: (query: string) => void
  searching: boolean
  loading: boolean
  error: string | null
  hasSearched: boolean
  activeShows: TmdbShowSummary[]
  filteredShows: TmdbShowSummary[]
  platformFor: (showId: number) => ResolvedProvider | null | undefined
  trendingResults: TmdbShowSummary[]
  filters: SearchFilters
  setFilters: (filters: SearchFilters) => void
  toggleFilter: (category: keyof SearchFilters, value: string) => void
  facets: SearchFilterFacets
  filterCounts: SearchFilterCounts
  filtersAvailable: boolean
  filtersActive: boolean
}

const SearchContext = createContext<SearchContextValue | undefined>(undefined)

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TmdbShowSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [trending, setTrending] = useState<TmdbShowSummary[]>([])
  const [genreNames, setGenreNames] = useState<Map<number, string>>(new Map())
  const [filters, setFilters] = useState<SearchFilters>(emptySearchFilters())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestId = useRef(0)

  const posterResults = useMemo(() => results.filter((s) => s.poster_path), [results])
  const resultIds = useMemo(() => posterResults.map((s) => s.id), [posterResults])
  const { platforms, platformNames } = useStreamingPlatforms(resultIds)

  const trendingResults = useMemo(() => trending.filter((s) => s.poster_path), [trending])
  const trendingIds = useMemo(() => trendingResults.map((s) => s.id), [trendingResults])
  const { platforms: trendingPlatforms, platformNames: trendingPlatformNames } = useStreamingPlatforms(trendingIds)

  const searching = query.trim().length > 0
  const activeShows = searching ? posterResults : trendingResults
  const activePlatformNames = searching ? platformNames : trendingPlatformNames
  const activePlatforms = searching ? platforms : trendingPlatforms

  const facets = useMemo(
    () => buildSearchFilterFacets(activeShows, genreNames, activePlatformNames),
    [activeShows, genreNames, activePlatformNames],
  )
  const filteredShows = useMemo(
    () => filterShows(activeShows, filters, genreNames, activePlatformNames),
    [activeShows, filters, genreNames, activePlatformNames],
  )
  const filterCounts = useMemo(
    () => countSearchFilterOptions(activeShows, filters, facets, genreNames, activePlatformNames),
    [activeShows, filters, facets, genreNames, activePlatformNames],
  )
  const filtersAvailable = facets.genres.length > 0 || facets.platforms.length > 0

  useEffect(() => {
    if (!isTmdbConfigured) return
    let cancelled = false
    getTrendingShows()
      .then((shows) => {
        if (!cancelled) setTrending(shows)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isTmdbConfigured) return
    let cancelled = false
    getTvGenres()
      .then((genres) => {
        if (!cancelled) setGenreNames(new Map(genres.map((g) => [g.id, g.name])))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (isSearchResultPending(searching, hasSearched)) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilters((prev) => pruneSearchFilters(prev, facets))
  }, [facets, searching, hasSearched])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = query.trim()
    if (!trimmed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([])
      setHasSearched(false)
      setError(null)
      setLoading(false)
      return
    }

    debounceRef.current = setTimeout(() => {
      const id = ++requestId.current
      setLoading(true)
      searchShows(trimmed)
        .then((shows) => {
          if (id === requestId.current) {
            setResults(shows)
            setError(null)
          }
        })
        .catch((err: unknown) => {
          if (id === requestId.current) {
            setError(errorMessage(err, 'Search failed.'))
            setResults([])
          }
        })
        .finally(() => {
          if (id === requestId.current) {
            setLoading(false)
            setHasSearched(true)
          }
        })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const value = useMemo<SearchContextValue>(
    () => ({
      query,
      setQuery,
      searching,
      loading,
      error,
      hasSearched,
      activeShows,
      filteredShows,
      platformFor: (showId) => activePlatforms.get(showId),
      trendingResults,
      filters,
      setFilters,
      toggleFilter(category, optionValue) {
        setFilters((prev) => {
          const next = new Set(prev[category])
          if (next.has(optionValue)) next.delete(optionValue)
          else next.add(optionValue)
          return { ...prev, [category]: next }
        })
      },
      facets,
      filterCounts,
      filtersAvailable,
      filtersActive: isSearchFiltersActive(filters),
    }),
    [
      query,
      searching,
      loading,
      error,
      hasSearched,
      activeShows,
      filteredShows,
      activePlatforms,
      trendingResults,
      filters,
      facets,
      filterCounts,
      filtersAvailable,
    ],
  )

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
}

export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext)
  if (!ctx) throw new Error('useSearch must be used within a SearchProvider')
  return ctx
}

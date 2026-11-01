import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ShowCard from '../components/ShowCard'
import { ShowGridSkeleton } from '../components/Skeletons'
import EmptyState from '../components/EmptyState'
import { POSTER_GRID_CLASSES } from '../components/PosterTile'
import SearchFiltersPanel from '../components/SearchFiltersPanel'
import { searchShows, getTrendingShows, getTvGenres, isTmdbConfigured } from '../lib/tmdb'
import { useStreamingPlatforms } from '../hooks/useStreamingPlatforms'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useQueryParam } from '../hooks/useQueryParam'
import { useBrowseShows } from '../hooks/useBrowseShows'
import { SEARCH_DEBOUNCE_MS } from '../lib/constants'
import { PAGE_HEADER_MOTION } from '../lib/motion'
import { errorMessage } from '../lib/format'
import ErrorText from '../components/ErrorText'
import {
  buildSearchFilterFacets,
  countActiveSearchFilters,
  countSearchFilterOptions,
  emptySearchFilters,
  filterShows,
  isSearchFiltersActive,
  isSearchResultPending,
  pruneSearchFilters,
} from '../lib/searchFilters'
import { PILL_ACTIVE_CLASSES, PILL_INACTIVE_CLASSES, PILL_SIZE_CLASSES } from '../components/Chip'
import type { SearchFilters } from '../lib/searchFilters'
import SearchField from '../components/SearchField'
import type { TmdbShowSummary } from '../types'

/** Each show once, keeping the first occurrence's position. */
function uniqueShows(shows: TmdbShowSummary[]): TmdbShowSummary[] {
  const seen = new Set<number>()
  return shows.filter((show) => {
    if (seen.has(show.id)) return false
    seen.add(show.id)
    return true
  })
}

/** "Popular on Netflix", or "Popular shows" when only genres are selected. */
function browseHeading(filters: SearchFilters): string {
  const platforms = Array.from(filters.platforms).sort()
  return platforms.length > 0 ? `Popular on ${platforms.join(', ')}` : 'Popular shows'
}

export default function Search() {
  useDocumentTitle('Search')
  const [query, setQuery] = useQueryParam('q')
  const [results, setResults] = useState<TmdbShowSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [trending, setTrending] = useState<TmdbShowSummary[]>([])
  const [genreNames, setGenreNames] = useState<Map<number, string>>(new Map())
  const [filters, setFilters] = useState<SearchFilters>(emptySearchFilters())
  const [filtersOpen, setFiltersOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestId = useRef(0)

  const posterResults = useMemo(() => results.filter((s) => s.poster_path), [results])
  const resultIds = useMemo(() => posterResults.map((s) => s.id), [posterResults])
  const { platforms, platformNames } = useStreamingPlatforms(resultIds)

  const searching = query.trim().length > 0
  const browsing = !searching && isSearchFiltersActive(filters)
  const browse = useBrowseShows(filters, genreNames, browsing)

  const trendingResults = useMemo(() => trending.filter((s) => s.poster_path), [trending])
  const browsePool = useMemo(() => uniqueShows([...trendingResults, ...browse.shows]), [trendingResults, browse.shows])
  const browseIds = useMemo(() => browsePool.map((s) => s.id), [browsePool])
  const {
    platforms: browsePlatforms,
    platformNames: browsePlatformNames,
    loading: loadingBrowsePlatforms,
  } = useStreamingPlatforms(browseIds)
  const browseLoading = browsing && (browse.loading || loadingBrowsePlatforms)

  const activeShows = searching ? posterResults : browsePool
  const activePlatformNames = searching ? platformNames : browsePlatformNames

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
    // oxlint-disable-next-line react/set-state-in-effect
    setFilters((prev) => pruneSearchFilters(prev, facets))
  }, [facets, searching, hasSearched])

  useEffect(() => {
    if (filtersOpen && !filtersAvailable) {
      // oxlint-disable-next-line react/set-state-in-effect
      setFiltersOpen(false)
    }
  }, [filtersOpen, filtersAvailable])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = query.trim()
    if (!trimmed) {
      // oxlint-disable-next-line react/set-state-in-effect
      setResults([])
      setHasSearched(false)
      setError(null)
      setLoading(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      const id = ++requestId.current
      setLoading(true)
      try {
        const shows = await searchShows(trimmed)
        if (id === requestId.current) {
          setResults(shows)
          setError(null)
        }
      } catch (err) {
        if (id === requestId.current) {
          setError(errorMessage(err, 'Search failed.'))
          setResults([])
        }
      } finally {
        if (id === requestId.current) {
          setLoading(false)
          setHasSearched(true)
        }
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 md:pb-10">
      <motion.h1 {...PAGE_HEADER_MOTION} className="font-display mb-5 text-2xl font-semibold text-base-100">
        Find a show
      </motion.h1>

      <SearchField value={query} onChange={setQuery} placeholder="Search for a TV show…" className="mb-4" />

      {filtersAvailable && (
        <div className="mb-6 flex justify-end">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-pressed={filtersOpen}
            className={`${PILL_SIZE_CLASSES} ${
              filtersOpen || isSearchFiltersActive(filters) ? PILL_ACTIVE_CLASSES : PILL_INACTIVE_CLASSES
            }`}
          >
            Filters{isSearchFiltersActive(filters) ? ` · ${countActiveSearchFilters(filters)}` : ''}
          </button>
        </div>
      )}

      <AnimatePresence>
        {filtersOpen && (
          <SearchFiltersPanel
            key="search-filters"
            facets={facets}
            filters={filters}
            counts={filterCounts}
            onChange={setFilters}
            onClose={() => setFiltersOpen(false)}
          />
        )}
      </AnimatePresence>

      {!isTmdbConfigured && (
        <div className="mb-6 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          TMDB isn&apos;t configured yet. Set VITE_TMDB_API_KEY (see DEVELOPMENT.md) to enable search.
        </div>
      )}

      {error && <ErrorText className="mb-4 text-sm">{error}</ErrorText>}

      {loading && <ShowGridSkeleton />}

      {!loading && (
        <AnimatePresence mode="popLayout">
          {filteredShows.length > 0 && searching ? (
            <motion.div
              layout
              className={POSTER_GRID_CLASSES}
            >
              {filteredShows.map((show, i) => (
                <ShowCard key={show.id} show={show} provider={platforms.get(show.id)} index={i} />
              ))}
            </motion.div>
          ) : hasSearched && !error ? (
            <EmptyState icon="🔍" className="mt-14">
              <p className="text-sm text-base-500">
                {posterResults.length > 0 ? (
                  'No shows match the selected filters.'
                ) : (
                  <>No shows found for &ldquo;{query}&rdquo;.</>
                )}
              </p>
            </EmptyState>
          ) : !searching ? (
            <div>
              <p className="mb-6 mt-2 text-center text-sm text-base-500">
                Search for any TV show to mark as now watching, add to watchlist or rate per season.
              </p>

              {browsePool.length > 0 && (
                <div>
                  <h2 className="mb-4 font-display text-lg font-semibold text-base-100">
                    {browsing ? browseHeading(filters) : 'Trending this week'}
                  </h2>
                  {filteredShows.length > 0 ? (
                    <div className={POSTER_GRID_CLASSES}>
                      {filteredShows.map((show, i) => (
                        <ShowCard key={show.id} show={show} provider={browsePlatforms.get(show.id)} index={i} />
                      ))}
                    </div>
                  ) : browseLoading ? (
                    <ShowGridSkeleton />
                  ) : (
                    <p className="text-sm text-base-500">No shows match the selected filters.</p>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </AnimatePresence>
      )}
    </div>
  )
}

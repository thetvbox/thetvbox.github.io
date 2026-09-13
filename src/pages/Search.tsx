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
import { SEARCH_DEBOUNCE_MS } from '../lib/constants'
import { PAGE_HEADER_MOTION } from '../lib/motion'
import { errorMessage } from '../lib/format'
import ErrorText from '../components/ErrorText'
import {
  buildSearchFilterFacets,
  countActiveSearchFilters,
  emptySearchFilters,
  filterShows,
  isSearchFiltersActive,
  pruneSearchFilters,
} from '../lib/searchFilters'
import type { SearchFilters } from '../lib/searchFilters'
import type { TmdbShowSummary } from '../types'

export default function Search() {
  useDocumentTitle('Search')
  const [query, setQuery] = useState('')
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
  const filtersRef = useRef<HTMLDivElement>(null)

  const posterResults = useMemo(() => results.filter((s) => s.poster_path), [results])
  const resultIds = useMemo(() => posterResults.map((s) => s.id), [posterResults])
  const { platforms } = useStreamingPlatforms(resultIds)

  const trendingResults = useMemo(() => trending.filter((s) => s.poster_path), [trending])
  const trendingIds = useMemo(() => trendingResults.map((s) => s.id), [trendingResults])
  const { platforms: trendingPlatforms } = useStreamingPlatforms(trendingIds)

  const searching = query.trim().length > 0
  const activeShows = searching ? posterResults : trendingResults
  const activePlatforms = searching ? platforms : trendingPlatforms

  const facets = useMemo(
    () => buildSearchFilterFacets(activeShows, genreNames, activePlatforms),
    [activeShows, genreNames, activePlatforms],
  )
  const filteredShows = useMemo(
    () => filterShows(activeShows, filters, genreNames, activePlatforms),
    [activeShows, filters, genreNames, activePlatforms],
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
    // Skip while a just-typed query hasn't resolved yet: posterResults (and so facets) are
    // momentarily empty between the keystroke and the debounced search landing, which would
    // otherwise wipe out an active filter selection before the real result set arrives.
    if (searching && !hasSearched) return
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
    if (!filtersOpen) return
    function handlePointerDown(e: PointerEvent) {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setFiltersOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [filtersOpen])

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

      <div className="relative mb-4">
        <svg
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base-500"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a TV show…"
          className="w-full rounded-xl border border-hairline-strong bg-base-850 py-3 pl-10 pr-4 text-base text-base-100 placeholder:text-base-500 transition-[border-color,box-shadow] duration-200 focus:border-accent-500/60 focus:ring-4 focus:ring-accent-500/10 sm:text-sm"
        />
      </div>

      {filtersAvailable && (
        <div className="mb-6 flex justify-end">
          <div ref={filtersRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              aria-haspopup="true"
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${
                filtersOpen || isSearchFiltersActive(filters)
                  ? 'bg-accent-500/15 text-accent-300 ring-1 ring-accent-500/40'
                  : 'bg-base-850/60 text-base-400 ring-1 ring-hairline hover:text-base-200'
              }`}
            >
              Filters{isSearchFiltersActive(filters) ? ` · ${countActiveSearchFilters(filters)}` : ''}
            </button>

            <AnimatePresence>
              {filtersOpen && (
                <SearchFiltersPanel
                  key="search-filters"
                  facets={facets}
                  filters={filters}
                  onChange={setFilters}
                  onClose={() => setFiltersOpen(false)}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

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

              {trendingResults.length > 0 && (
                <div>
                  <h2 className="mb-4 font-display text-lg font-semibold text-base-100">Trending this week</h2>
                  {filteredShows.length > 0 ? (
                    <div className={POSTER_GRID_CLASSES}>
                      {filteredShows.map((show, i) => (
                        <ShowCard key={show.id} show={show} provider={trendingPlatforms.get(show.id)} index={i} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-base-500">No trending shows match the selected filters.</p>
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

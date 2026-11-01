import { useEffect, useState } from 'react'
import { detectRegion, discoverShows, getAllTvProviders } from '../lib/tmdb'
import type { SearchFilters } from '../lib/searchFilters'
import type { TmdbShowSummary } from '../types'

/** TMDB's most popular shows for the selected platforms and genres, so filtering without a search browses the whole catalog instead of just this week's trending shows. */
export function useBrowseShows(
  filters: SearchFilters,
  genreNames: Map<number, string>,
  enabled: boolean,
): { shows: TmdbShowSummary[]; loading: boolean } {
  const [shows, setShows] = useState<TmdbShowSummary[]>([])
  const [loading, setLoading] = useState(false)
  const platformsKey = Array.from(filters.platforms).sort().join('\n')
  const genresKey = Array.from(filters.genres).sort().join('\n')

  useEffect(() => {
    if (!enabled || (!platformsKey && !genresKey)) {
      // oxlint-disable-next-line react/set-state-in-effect
      setShows([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    const region = detectRegion()
    const wantedPlatforms = new Set(platformsKey ? platformsKey.split('\n') : [])
    const wantedGenres = new Set(genresKey ? genresKey.split('\n') : [])
    const genreIds = Array.from(genreNames.entries())
      .filter(([, name]) => wantedGenres.has(name))
      .map(([id]) => id)
    ;(wantedPlatforms.size > 0 ? getAllTvProviders(region) : Promise.resolve([]))
      .then((providers) => {
        const providerIds = providers.filter((p) => wantedPlatforms.has(p.provider_name)).map((p) => p.provider_id)
        if (wantedPlatforms.size > 0 && providerIds.length === 0) return []
        return discoverShows({ providerIds, genreIds, region })
      })
      .then((results) => {
        if (!cancelled) setShows(results.filter((s) => s.poster_path))
      })
      .catch(() => {
        if (!cancelled) setShows([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [enabled, platformsKey, genresKey, genreNames])

  return { shows, loading }
}

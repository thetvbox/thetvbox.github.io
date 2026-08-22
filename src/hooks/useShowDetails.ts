import { useEffect, useState } from 'react'
import { getShowDetailsBulk } from '../lib/tmdb'
import type { TmdbShowDetail } from '../types'

/** Bulk TMDB show details (genre, year, country, language, status) for the
 * History filters. `enabled` gates the fetch so it only fires once someone
 * expands Filters, not on every History tab visit. */
export function useShowDetails(
  showIds: number[],
  enabled: boolean,
): { details: Map<number, TmdbShowDetail>; loading: boolean } {
  const [details, setDetails] = useState<Map<number, TmdbShowDetail>>(new Map())
  const [loading, setLoading] = useState(false)
  const key = showIds.join(',')

  useEffect(() => {
    if (!enabled || !key) {
      return
    }
    let cancelled = false
    setLoading(true)
    getShowDetailsBulk(key.split(',').map(Number))
      .then((map) => {
        if (!cancelled) setDetails(map)
      })
      .catch(() => {
        // Degrades gracefully -- a missing show just won't match any facet.
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [key, enabled])

  return { details, loading }
}

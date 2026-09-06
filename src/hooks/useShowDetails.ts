import { useEffect, useState } from 'react'
import { getShowDetailsBulk } from '../lib/tmdb'
import type { TmdbShowDetail } from '../types'

/** Fetches bulk TMDB show details for the History filters, gated by `enabled`. */
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
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [key, enabled])

  return { details, loading }
}

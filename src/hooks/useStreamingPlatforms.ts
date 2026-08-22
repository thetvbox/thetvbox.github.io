import { useEffect, useState } from 'react'
import { detectRegion } from '../lib/tmdb'
import { resolveShowPlatforms } from '../lib/streamingProvider'
import type { ResolvedProvider } from '../lib/streamingProvider'

/** Resolves "where to watch" for a batch of shows (cached, so repeat calls
 * are free) and keeps it as component state. */
export function useStreamingPlatforms(showIds: number[]): {
  platforms: Map<number, ResolvedProvider | null>
  loading: boolean
} {
  const [platforms, setPlatforms] = useState<Map<number, ResolvedProvider | null>>(new Map())
  const [loading, setLoading] = useState(false)
  const key = showIds.join(',')

  useEffect(() => {
    if (!key) {
      setPlatforms(new Map())
      return
    }
    let cancelled = false
    setLoading(true)
    resolveShowPlatforms(key.split(',').map(Number), detectRegion())
      .then((map) => {
        if (!cancelled) setPlatforms(map)
      })
      .catch(() => {
        // Badges are a nice-to-have -- callers just render nothing per show.
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [key])

  return { platforms, loading }
}

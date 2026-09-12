import { useEffect, useState } from 'react'
import { detectRegion } from '../lib/tmdb'
import { resolveShowPlatforms } from '../lib/streamingProvider'
import type { ResolvedProvider } from '../lib/streamingProvider'

/** Resolves "where to watch" for a batch of shows and keeps it as component state. */
export function useStreamingPlatforms(showIds: number[]): {
  platforms: Map<number, ResolvedProvider | null>
  loading: boolean
} {
  const [platforms, setPlatforms] = useState<Map<number, ResolvedProvider | null>>(new Map())
  const [loading, setLoading] = useState(false)
  const key = showIds.join(',')

  useEffect(() => {
    if (!key) {
      // Nothing to fetch for an empty id list -- resets to match, same reasoning as the fetch
      // effect below.
      // oxlint-disable-next-line react/set-state-in-effect
      setPlatforms(new Map())
      return
    }
    let cancelled = false
    // Genuinely synchronizing with an external system (a network fetch); known false positive
    // for this pattern, see https://github.com/facebook/react/issues/34743
    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true)
    resolveShowPlatforms(key.split(',').map(Number), detectRegion())
      .then((map) => {
        if (!cancelled) setPlatforms(map)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [key])

  return { platforms, loading }
}

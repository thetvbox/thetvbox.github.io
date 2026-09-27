import { useEffect, useState } from 'react'
import { detectRegion } from '../lib/tmdb'
import { resolveShowPlatformNames, resolveShowPlatforms } from '../lib/streamingProvider'
import type { ResolvedProvider } from '../lib/streamingProvider'

/** Resolves "where to watch" for a batch of shows and keeps it as component state -- `platformNames` carries every service each show streams on (for "is this on Netflix" filtering), while `platforms` stays the single best-guess badge pick. */
export function useStreamingPlatforms(showIds: number[]): {
  platforms: Map<number, ResolvedProvider | null>
  platformNames: Map<number, Set<string>>
  loading: boolean
} {
  const [platforms, setPlatforms] = useState<Map<number, ResolvedProvider | null>>(new Map())
  const [platformNames, setPlatformNames] = useState<Map<number, Set<string>>>(new Map())
  const [loading, setLoading] = useState(false)
  const key = showIds.join(',')

  useEffect(() => {
    if (!key) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlatforms(new Map())
      setPlatformNames(new Map())
      setLoading(false)
      return
    }
    let cancelled = false
    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true)
    const ids = key.split(',').map(Number)
    const region = detectRegion()
    resolveShowPlatforms(ids, region)
      .then((map) => {
        if (!cancelled) setPlatforms(map)
        return resolveShowPlatformNames(ids, region)
      })
      .then((map) => {
        if (!cancelled) setPlatformNames(map)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [key])

  return { platforms, platformNames, loading }
}

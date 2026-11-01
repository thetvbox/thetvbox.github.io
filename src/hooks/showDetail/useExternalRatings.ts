import { useEffect, useState } from 'react'
import { getExternalRatings } from '../../lib/omdb'
import type { ExternalRatings, TmdbShowDetail } from '../../types'

/** A show's IMDb rating and Rotten Tomatoes score from OMDb: undefined while loading, null when OMDb has none or fails. */
export function useExternalRatings(show: TmdbShowDetail | null): ExternalRatings | null | undefined {
  const [loaded, setLoaded] = useState<{ show: TmdbShowDetail; ratings: ExternalRatings | null } | null>(null)

  useEffect(() => {
    if (!show) return
    let cancelled = false
    getExternalRatings(show.external_ids?.imdb_id)
      .catch(() => null)
      .then((ratings) => {
        if (!cancelled) setLoaded({ show, ratings })
      })
    return () => {
      cancelled = true
    }
  }, [show])

  return show && loaded?.show === show ? loaded.ratings : undefined
}

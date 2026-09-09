import { useEffect, useState } from 'react'
import { getExternalRatings } from '../../lib/omdb'
import type { ExternalRatings, TmdbShowDetail } from '../../types'

/** Fetches a show's IMDb rating + Rotten Tomatoes score from OMDb, keyed off TMDB's IMDb id. */
export function useExternalRatings(show: TmdbShowDetail | null): ExternalRatings | null {
  const [externalRatings, setExternalRatings] = useState<ExternalRatings | null>(null)

  useEffect(() => {
    if (!show) return
    let cancelled = false
    getExternalRatings(show.external_ids?.imdb_id)
      .then((ratings) => {
        if (!cancelled) setExternalRatings(ratings)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [show])

  return externalRatings
}

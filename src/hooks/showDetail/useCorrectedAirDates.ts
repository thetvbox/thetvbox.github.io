import { useEffect, useMemo, useState } from 'react'
import { effectiveAirDate as resolveAirDate, findNextUpcomingEpisode, getCorrectedAirDates } from '../../lib/tvmaze'
import type { TmdbSeasonDetail, TmdbShowDetail } from '../../types'

/** Fetches TVmaze's air-date corrections for a show and applies them to its episodes. */
export function useCorrectedAirDates(show: TmdbShowDetail | null, season: TmdbSeasonDetail | null) {
  const [correctedAirDates, setCorrectedAirDates] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    if (!show) return
    let cancelled = false
    getCorrectedAirDates(show.external_ids?.imdb_id)
      .then((dates) => {
        if (!cancelled) setCorrectedAirDates(dates)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [show])

  /** Returns TVmaze's correction for one episode's air date, or its own TMDB date unchanged. */
  function effectiveAirDate(ep: { season_number: number; episode_number: number; air_date: string | null }): string | null {
    return resolveAirDate(ep, correctedAirDates)
  }

  const nextUpcomingEpisode = useMemo(() => {
    if (!season) return null
    const ep = findNextUpcomingEpisode(season.episodes, correctedAirDates)
    if (!ep) return null
    return { ...ep, air_date: effectiveAirDate(ep) }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- effectiveAirDate closes over correctedAirDates, already a dep below
  }, [season, correctedAirDates])

  return { effectiveAirDate, nextUpcomingEpisode }
}

import { useEffect, useMemo, useState } from 'react'
import { getCorrectedAirDates, tvmazeEpisodeKey } from '../../lib/tvmaze'
import { isFutureDate } from '../../lib/date'
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
    if (!ep.air_date) return null
    return correctedAirDates.get(tvmazeEpisodeKey(ep.season_number, ep.episode_number)) ?? ep.air_date
  }

  const nextUpcomingEpisode = useMemo(() => {
    if (!season) return null
    const ep = season.episodes.find((e) => e.air_date && isFutureDate(e.air_date)) ?? null
    if (!ep) return null
    return { ...ep, air_date: effectiveAirDate(ep) }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- effectiveAirDate closes over correctedAirDates, already a dep below
  }, [season, correctedAirDates])

  return { effectiveAirDate, nextUpcomingEpisode }
}

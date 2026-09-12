import { useEffect, useMemo, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import SeasonTabs from '../SeasonTabs'
import SeasonProgressBar from '../SeasonProgressBar'
import RatingSummary from '../RatingSummary'
import DateMarkControl from '../DateMarkControl'
import EpisodeRow from '../EpisodeRow'
import { EpisodeRowSkeleton } from '../Skeletons'
import { formatShortDate, isFutureDate } from '../../lib/date'
import { pluralSuffix } from '../../lib/format'
import { scrollBehavior } from '../../lib/motion'
import { computeSeasonProgress, countWatchedBySeason } from '../../lib/seasonProgress'
import { watchedKey } from '../../lib/watched'
import type { SeasonRatingWithUser, TmdbEpisode, TmdbSeasonDetail, TmdbShowDetail, WatchedMap } from '../../types'

interface ShowDetailSeasonsProps {
  show: TmdbShowDetail
  activeSeason: number
  onSelectSeason: (seasonNumber: number) => void
  season: TmdbSeasonDetail | null
  loadingSeason: boolean
  seasonWatchedCount: number | null
  onMarkSeasonWatched: (input: { watchedAt: string; unknownDate: boolean }) => Promise<void>
  seasonRatings: SeasonRatingWithUser[]
  myRating: number
  savingSeasonRating: boolean
  currentUserId?: string
  onRateSeason: (value: number) => void
  nextUpcomingEpisode: TmdbEpisode | null
  watched: WatchedMap
  effectiveAirDate: (ep: { season_number: number; episode_number: number; air_date: string | null }) => string | null
  onToggleWatched: (episodeNumber: number, episodeName: string, runtimeMinutes: number | null) => Promise<void>
  onMarkWatchedWithDate: (
    episodeNumber: number,
    episodeName: string,
    runtimeMinutes: number | null,
    input: { watchedAt: string; unknownDate: boolean },
  ) => Promise<void>
  jumpToProgress?: boolean
}

/** Season tabs, the "next episode airs" banner, the per-season rating, and the episode list. */
export default function ShowDetailSeasons({
  show,
  activeSeason,
  onSelectSeason,
  season,
  loadingSeason,
  seasonWatchedCount,
  onMarkSeasonWatched,
  seasonRatings,
  myRating,
  savingSeasonRating,
  currentUserId,
  onRateSeason,
  nextUpcomingEpisode,
  watched,
  effectiveAirDate,
  onToggleWatched,
  onMarkWatchedWithDate,
  jumpToProgress,
}: ShowDetailSeasonsProps) {
  const nextUpRef = useRef<HTMLDivElement>(null)
  const hasJumpedRef = useRef(false)

  const nextUpEpisode = season?.episodes.find(
    (ep) => !watched[watchedKey(ep.season_number, ep.episode_number)] && !(ep.air_date && isFutureDate(ep.air_date)),
  )

  // Per-season watched/total, for the season tabs' completion checkmark and this season's
  // progress bar -- `watched` already covers the whole show, so no extra fetch needed.
  const seasonSegments = useMemo(
    () => computeSeasonProgress(show.seasons, countWatchedBySeason(Object.values(watched)))?.segments ?? [],
    [show.seasons, watched],
  )

  const lastWatchedEpisode = season?.episodes
    .filter((ep) => watched[watchedKey(ep.season_number, ep.episode_number)])
    .at(-1)
  const scrollTargetEpisode = nextUpEpisode ?? lastWatchedEpisode

  useEffect(() => {
    if (!jumpToProgress || hasJumpedRef.current || loadingSeason || !scrollTargetEpisode) return
    hasJumpedRef.current = true
    const raf = requestAnimationFrame(() => {
      nextUpRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'center' })
    })
    return () => cancelAnimationFrame(raf)
  }, [jumpToProgress, loadingSeason, scrollTargetEpisode])

  return (
    <div className="mt-8 border-t border-hairline pt-6">
      {nextUpcomingEpisode && (
        <p className="mb-3 text-xs text-base-500">
          {/* "New episode" (not "Next"/"Up next") -- distinct from the per-episode "Up next"
             badge below, which is about resuming where you left off, not new releases. */}
          New episode: S{nextUpcomingEpisode.season_number}E{nextUpcomingEpisode.episode_number} airs{' '}
          {formatShortDate(nextUpcomingEpisode.air_date!)}
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <SeasonTabs seasons={show.seasons} active={activeSeason} onSelect={onSelectSeason} segments={seasonSegments} />
        {season && seasonWatchedCount !== null && (
          <div className="flex shrink-0 items-center gap-2.5 text-xs text-base-400">
            <div className="w-16 sm:w-24">
              <SeasonProgressBar segments={[{ seasonNumber: activeSeason, watched: seasonWatchedCount, total: season.episodes.length }]} />
            </div>
            <span>
              {seasonWatchedCount}/{season.episodes.length} watched this season
            </span>
            <AnimatePresence initial={false}>
              {seasonWatchedCount < season.episodes.length && (
                <DateMarkControl
                  key="mark-season"
                  label="Mark season watched"
                  onConfirm={onMarkSeasonWatched}
                  confirmSummary={
                    seasonWatchedCount > 0
                      ? `This will overwrite the date on ${seasonWatchedCount} already-watched episode${pluralSuffix(seasonWatchedCount)} in this season.`
                      : undefined
                  }
                />
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="mb-5">
        <RatingSummary
          ratings={seasonRatings}
          myRating={myRating}
          onChange={onRateSeason}
          saving={savingSeasonRating}
          currentUserId={currentUserId}
          size="md"
          emptyLabel="You're the first to rate this season"
          ratingLabel={`Rate Season ${activeSeason}`}
        />
      </div>

      <div className="space-y-3">
        {loadingSeason
          ? Array.from({ length: 4 }).map((_, i) => <EpisodeRowSkeleton key={i} />)
          : season?.episodes.map((ep) => (
              <EpisodeRow
                key={ep.id}
                episode={ep.air_date ? { ...ep, air_date: effectiveAirDate(ep) } : ep}
                watched={Boolean(watched[watchedKey(ep.season_number, ep.episode_number)])}
                watchedAt={watched[watchedKey(ep.season_number, ep.episode_number)]?.watched_at ?? null}
                watchedAtUnknown={Boolean(watched[watchedKey(ep.season_number, ep.episode_number)]?.watched_at_unknown)}
                onToggleWatched={() => onToggleWatched(ep.episode_number, ep.name, ep.runtime)}
                onMarkWatchedWithDate={(input) => onMarkWatchedWithDate(ep.episode_number, ep.name, ep.runtime, input)}
                rootRef={ep.episode_number === scrollTargetEpisode?.episode_number ? nextUpRef : undefined}
                isUpNext={ep.episode_number === nextUpEpisode?.episode_number}
              />
            ))}
      </div>
    </div>
  )
}

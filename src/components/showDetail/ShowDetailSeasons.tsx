import { useEffect, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import SeasonTabs from '../SeasonTabs'
import RatingSummary from '../RatingSummary'
import DateMarkControl from '../DateMarkControl'
import EpisodeRow from '../EpisodeRow'
import { EpisodeRowSkeleton } from '../Skeletons'
import { formatShortDate, isFutureDate } from '../../lib/date'
import { scrollBehavior } from '../../lib/motion'
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
  /** True when this page was opened from Home's Now Watching card -- scrolls
   * straight to the next-unwatched episode once, instead of landing at the top. */
  jumpToProgress?: boolean
}

/** Season tabs, the "next episode airs" banner, the per-season rating, and
 * the active season's episode list. */
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
  // Guards against re-firing on every re-render (marking an episode watched
  // changes `watched`, which would otherwise recompute nextUpEpisode and
  // yank the page back down) -- only the first landing after navigating in
  // from Now Watching should scroll.
  const hasJumpedRef = useRef(false)

  // First episode in the active season that's actually ready to watch (aired,
  // not yet marked watched) -- the "next up" row jumpToProgress scrolls to.
  const nextUpEpisode = season?.episodes.find(
    (ep) => !watched[watchedKey(ep.season_number, ep.episode_number)] && !(ep.air_date && isFutureDate(ep.air_date)),
  )

  useEffect(() => {
    if (!jumpToProgress || hasJumpedRef.current || loadingSeason || !nextUpEpisode) return
    hasJumpedRef.current = true
    // Season loads right after mount -- wait a frame so layout has settled
    // before measuring where to scroll to.
    const raf = requestAnimationFrame(() => {
      nextUpRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'center' })
    })
    return () => cancelAnimationFrame(raf)
  }, [jumpToProgress, loadingSeason, nextUpEpisode])

  return (
    <div className="mt-8 border-t border-hairline pt-6">
      {nextUpcomingEpisode && (
        <p className="mb-3 text-xs text-base-500">
          Next: S{nextUpcomingEpisode.season_number}E{nextUpcomingEpisode.episode_number} airs{' '}
          {formatShortDate(nextUpcomingEpisode.air_date!)}
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <SeasonTabs seasons={show.seasons} active={activeSeason} onSelect={onSelectSeason} />
        {season && seasonWatchedCount !== null && (
          <div className="flex shrink-0 items-center gap-2 text-xs text-base-400">
            <span>
              {seasonWatchedCount}/{season.episodes.length} watched
            </span>
            <AnimatePresence initial={false}>
              {seasonWatchedCount < season.episodes.length && (
                <DateMarkControl
                  key="mark-season"
                  label="Mark season watched"
                  onConfirm={onMarkSeasonWatched}
                  confirmSummary={
                    seasonWatchedCount > 0
                      ? `This will overwrite the date on ${seasonWatchedCount} already-watched episode${seasonWatchedCount === 1 ? '' : 's'} in this season.`
                      : undefined
                  }
                />
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Independent of the show-level rating above, the way IMDb/Rotten
          Tomatoes show a season score next to a show's overall one. */}
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
                rootRef={ep.episode_number === nextUpEpisode?.episode_number ? nextUpRef : undefined}
              />
            ))}
      </div>
    </div>
  )
}

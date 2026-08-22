import SeasonTabs from '../SeasonTabs'
import RatingSummary from '../RatingSummary'
import DateMarkControl from '../DateMarkControl'
import EpisodeRow from '../EpisodeRow'
import { EpisodeRowSkeleton } from '../Skeletons'
import { formatShortDate } from '../../lib/date'
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
}: ShowDetailSeasonsProps) {
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
            {seasonWatchedCount < season.episodes.length && (
              <DateMarkControl
                label="Mark season watched"
                onConfirm={onMarkSeasonWatched}
                confirmSummary={
                  seasonWatchedCount > 0
                    ? `This will overwrite the date on ${seasonWatchedCount} already-watched episode${seasonWatchedCount === 1 ? '' : 's'} in this season.`
                    : undefined
                }
              />
            )}
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
              />
            ))}
      </div>
    </div>
  )
}

import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { DateMarkControl } from '@/components/date-mark-control';
import { EpisodeRow } from '@/components/episode-row';
import { EpisodeRowSkeleton } from '@/components/skeletons';
import { RatingSummary } from '@/components/rating-summary';
import { SeasonTabs } from '@/components/season-tabs';
import { SeasonProgressBar } from '@/components/season-progress-bar';
import { formatShortDate, isFutureDate } from '@/lib/date';
import { pluralSuffix } from '@/lib/format';
import { computeSeasonProgress, countWatchedBySeason } from '@/lib/seasonProgress';
import { watchedKey } from '@/lib/watched';
import type { SeasonRatingWithUser, TmdbEpisode, TmdbSeasonDetail, TmdbShowDetail, WatchedMap } from '@/types';

interface ShowDetailSeasonsProps {
  show: TmdbShowDetail;
  activeSeason: number;
  onSelectSeason: (seasonNumber: number) => void;
  season: TmdbSeasonDetail | null;
  loadingSeason: boolean;
  seasonWatchedCount: number | null;
  onMarkSeasonWatched: (input: { watchedAt: string; unknownDate: boolean }) => Promise<void>;
  seasonRatings: SeasonRatingWithUser[];
  myRating: number;
  savingSeasonRating: boolean;
  currentUserId?: string;
  onRateSeason: (value: number) => void;
  nextUpcomingEpisode: TmdbEpisode | null;
  watched: WatchedMap;
  effectiveAirDate: (ep: { season_number: number; episode_number: number; air_date: string | null }) => string | null;
  onToggleWatched: (episodeNumber: number, episodeName: string, runtimeMinutes: number | null) => Promise<void>;
  onMarkWatchedWithDate: (
    episodeNumber: number,
    episodeName: string,
    runtimeMinutes: number | null,
    input: { watchedAt: string; unknownDate: boolean },
  ) => Promise<void>;
}

/** Season tabs, the "next episode airs" banner, the per-season rating (replaced by an "Airs <date>" badge while the season itself hasn't started airing yet), and the episode list. */
export function ShowDetailSeasons({
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
  const episodesWithEffectiveDates = useMemo(
    () => season?.episodes.map((ep) => (ep.air_date ? { ...ep, air_date: effectiveAirDate(ep) } : ep)) ?? null,
    [season, effectiveAirDate],
  );

  const nextUpEpisode = episodesWithEffectiveDates?.find(
    (ep) => !watched[watchedKey(ep.season_number, ep.episode_number)] && !(ep.air_date && isFutureDate(ep.air_date)),
  );
  const seasonAirDate = season?.air_date ?? null;
  const seasonUpcoming = Boolean(seasonAirDate && isFutureDate(seasonAirDate));

  const seasonSegments = useMemo(
    () => computeSeasonProgress(show.seasons, countWatchedBySeason(Object.values(watched)))?.segments ?? [],
    [show.seasons, watched],
  );

  return (
    <View className="mt-8 gap-4 border-t border-hairline pt-6">
      {nextUpcomingEpisode && (
        <Text className="text-xs text-base-500">
          New episode: S{nextUpcomingEpisode.season_number}E{nextUpcomingEpisode.episode_number} airs {formatShortDate(nextUpcomingEpisode.air_date!)}
        </Text>
      )}

      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <SeasonTabs seasons={show.seasons} active={activeSeason} onSelect={onSelectSeason} segments={seasonSegments} />
        {season && seasonWatchedCount !== null && (
          <View className="flex-row shrink-0 items-center gap-2.5">
            <View className="w-16">
              <SeasonProgressBar segments={[{ seasonNumber: activeSeason, watched: seasonWatchedCount, total: season.episodes.length }]} />
            </View>
            <Text className="text-xs text-base-400">
              {seasonWatchedCount}/{season.episodes.length} watched this season
            </Text>
            {seasonWatchedCount < season.episodes.length && (
              <DateMarkControl
                label="Mark season watched"
                onConfirm={onMarkSeasonWatched}
                confirmSummary={
                  seasonWatchedCount > 0
                    ? `This will overwrite the date on ${seasonWatchedCount} already-watched episode${pluralSuffix(seasonWatchedCount)} in this season.`
                    : undefined
                }
              />
            )}
          </View>
        )}
      </View>

      <View>
        {seasonUpcoming ? (
          <View className="self-start rounded-full border border-hairline-strong px-3 py-1.5">
            <Text className="text-xs font-medium text-base-500">Airs {formatShortDate(seasonAirDate!)}</Text>
          </View>
        ) : (
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
        )}
      </View>

      <View className="gap-3">
        {loadingSeason
          ? Array.from({ length: 4 }).map((_, i) => <EpisodeRowSkeleton key={i} />)
          : episodesWithEffectiveDates?.map((ep) => (
              <EpisodeRow
                key={ep.id}
                episode={ep}
                watched={Boolean(watched[watchedKey(ep.season_number, ep.episode_number)])}
                watchedAt={watched[watchedKey(ep.season_number, ep.episode_number)]?.watched_at ?? null}
                watchedAtUnknown={Boolean(watched[watchedKey(ep.season_number, ep.episode_number)]?.watched_at_unknown)}
                onToggleWatched={onToggleWatched}
                onMarkWatchedWithDate={onMarkWatchedWithDate}
                isUpNext={ep.episode_number === nextUpEpisode?.episode_number}
              />
            ))}
      </View>
    </View>
  );
}

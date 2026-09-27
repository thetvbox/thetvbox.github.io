import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { EstimatedShowRating } from '@/components/estimated-show-rating';
import { ExternalRatings } from '@/components/external-ratings';
import { RatingSummary } from '@/components/rating-summary';
import { pluralSuffix } from '@/lib/format';
import { posterUrl, yearFromDate } from '@/lib/tmdb';
import type { ExternalRatings as ExternalRatingsData, SeasonRatingWithUser, ShowRatingWithUser, TmdbShowDetail } from '@/types';

const HERO_POSTER_WIDTH = 128;

interface ShowDetailHeroProps {
  show: TmdbShowDetail | null;
  loadingShow: boolean;
  showRatings: ShowRatingWithUser[];
  myRating: number;
  estimatedShowRating?: { average: number; seasons: SeasonRatingWithUser[] } | null;
  externalRatings?: ExternalRatingsData | null;
  savingRating: boolean;
  currentUserId?: string;
  onRateShow: (value: number) => void;
}

/** Poster, title/meta, and the show-level rating summary. */
export function ShowDetailHero({
  show,
  loadingShow,
  showRatings,
  myRating,
  estimatedShowRating = null,
  externalRatings = null,
  savingRating,
  currentUserId,
  onRateShow,
}: ShowDetailHeroProps) {
  const poster = show?.poster_path ? posterUrl(show.poster_path) : null;

  return (
    <View>
      <View className="flex-row items-end gap-4">
        <View className="shrink-0 overflow-hidden rounded-xl bg-base-800" style={{ width: HERO_POSTER_WIDTH, aspectRatio: 2 / 3 }}>
          {poster && <Image source={{ uri: poster }} style={{ flex: 1 }} contentFit="cover" transition={200} />}
        </View>

        <View className="min-w-0 flex-1">
          {loadingShow ? (
            <View className="gap-2">
              <View className="h-6 w-2/3 rounded bg-base-800" />
              <View className="h-3 w-1/3 rounded bg-base-800" />
            </View>
          ) : (
            show && (
              <>
                <Text className="font-display text-xl font-semibold text-base-100">{show.name}</Text>
                <Text className="mt-1 text-xs text-base-400">
                  {yearFromDate(show.first_air_date)} · {show.number_of_seasons} season{pluralSuffix(show.number_of_seasons)} · {show.status}
                </Text>
                <ExternalRatings ratings={externalRatings} imdbId={show.external_ids?.imdb_id} showName={show.name} />
              </>
            )
          )}
        </View>
      </View>

      {show && !loadingShow && (
        <View className="mt-5">
          <RatingSummary
            ratings={showRatings}
            myRating={myRating}
            onChange={onRateShow}
            saving={savingRating}
            currentUserId={currentUserId}
            size="lg"
            ratingLabel="Rate this show"
          />
          {estimatedShowRating && <EstimatedShowRating average={estimatedShowRating.average} seasons={estimatedShowRating.seasons} />}
        </View>
      )}
    </View>
  );
}

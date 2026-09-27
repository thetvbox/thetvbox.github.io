import { Pressable, Text, View } from 'react-native';

import { openExternalLink } from '@/lib/browser';
import { rottenTomatoesUrl } from '@/lib/rottenTomatoes';
import type { ExternalRatings as ExternalRatingsData } from '@/types';

const ROTTEN_TOMATOES_FRESH_THRESHOLD = 60;

interface ExternalRatingsProps {
  ratings: ExternalRatingsData | null;
  imdbId?: string | null;
  showName?: string | null;
}

/** IMDb rating + Rotten Tomatoes score/link for a show, opened in an in-app browser view. */
export function ExternalRatings({ ratings, imdbId, showName }: ExternalRatingsProps) {
  const imdbRating = ratings?.imdbRating ?? null;
  const rottenTomatoesScore = ratings?.rottenTomatoesScore ?? null;
  if (imdbRating === null && rottenTomatoesScore === null && !showName) return null;

  const rtFresh = rottenTomatoesScore !== null && rottenTomatoesScore >= ROTTEN_TOMATOES_FRESH_THRESHOLD;

  return (
    <View className="mt-2 flex-row flex-wrap items-center gap-4">
      {imdbRating !== null && (
        <Pressable
          onPress={imdbId ? () => openExternalLink(`https://www.imdb.com/title/${imdbId}/`) : undefined}
          className="flex-row items-center gap-1.5"
          accessibilityRole={imdbId ? 'link' : undefined}
        >
          <View className="rounded bg-[#f5c518] px-1 py-0.5">
            <Text className="text-[10px] font-bold text-black">IMDb</Text>
          </View>
          <Text className="text-sm font-medium text-base-300">{imdbRating.toFixed(1)}</Text>
        </Pressable>
      )}
      {(rottenTomatoesScore !== null || showName) && (
        <Pressable onPress={() => openExternalLink(rottenTomatoesUrl(showName ?? ''))} className="flex-row items-center gap-1.5" accessibilityRole="link" accessibilityLabel="Rotten Tomatoes">
          <Text className="text-lg">🍅</Text>
          {rottenTomatoesScore !== null ? (
            <Text className="text-sm font-medium text-base-300">
              {rtFresh ? '🟢' : '🔴'} {rottenTomatoesScore}%
            </Text>
          ) : (
            <View className="rounded-full border border-accent-500/30 bg-accent-500/10 px-2.5 py-1">
              <Text className="text-xs font-medium text-accent-300">Click to see score</Text>
            </View>
          )}
        </Pressable>
      )}
    </View>
  );
}

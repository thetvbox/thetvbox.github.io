import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { memo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ActionPill } from '@/components/action-pill';
import { DateMarkControl } from '@/components/date-mark-control';
import { formatShortDate, isFutureDate } from '@/lib/date';
import { stillUrl } from '@/lib/tmdb';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { TmdbEpisode } from '@/types';

interface EpisodeRowProps {
  episode: TmdbEpisode;
  watched: boolean;
  watchedAt: string | null;
  watchedAtUnknown: boolean;
  onToggleWatched: (episodeNumber: number, episodeName: string, runtimeMinutes: number | null) => Promise<void>;
  onMarkWatchedWithDate: (
    episodeNumber: number,
    episodeName: string,
    runtimeMinutes: number | null,
    input: { watchedAt: string; unknownDate: boolean },
  ) => Promise<void>;
  isUpNext?: boolean;
}

/** One episode's still, synopsis, and watch controls -- memoized so toggling one episode doesn't re-render the whole season list. */
function EpisodeRowImpl({
  episode,
  watched,
  watchedAt,
  watchedAtUnknown,
  onToggleWatched,
  onMarkWatchedWithDate,
  isUpNext = false,
}: EpisodeRowProps) {
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const theme = useThemeColors();
  const still = stillUrl(episode.still_path);
  const isUpcoming = Boolean(episode.air_date && isFutureDate(episode.air_date));

  async function handleToggle() {
    setSaving(true);
    try {
      await onToggleWatched(episode.episode_number, episode.name, episode.runtime);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View
      className={`gap-3 rounded-xl border bg-base-850/60 p-3 ${
        watched ? 'border-hairline' : isUpNext ? 'border-accent-500/40' : 'border-hairline'
      } ${isUpcoming ? 'opacity-60' : ''}`}
    >
      <View className="aspect-video w-full overflow-hidden rounded-lg bg-base-800">
        {still ? (
          <Image source={{ uri: still }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <View className="h-full w-full items-center justify-center gap-1">
            <SymbolView name="photo" size={26} tintColor={theme.textSecondary} />
            <Text className="text-[10px] text-base-500">No image</Text>
          </View>
        )}
        {episode.runtime ? (
          <View className="absolute bottom-1.5 right-1.5 rounded-md bg-black/70 px-1.5 py-0.5">
            <Text className="text-[10px] font-medium text-white">{episode.runtime}m</Text>
          </View>
        ) : null}
      </View>

      <View className="min-w-0 gap-1">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="text-[11px] font-semibold uppercase tracking-wide text-accent-400">Episode {episode.episode_number}</Text>
          {isUpNext && (
            <View className="rounded-full bg-accent-500/15 px-2 py-0.5">
              <Text className="text-[10px] font-semibold uppercase tracking-wide text-accent-300">Up next</Text>
            </View>
          )}
        </View>
        <Text className="text-sm font-medium text-base-100">{episode.name || `Episode ${episode.episode_number}`}</Text>

        <Text
          numberOfLines={expanded ? undefined : 2}
          onTextLayout={(e) => setTruncated(!expanded && e.nativeEvent.lines.length >= 2)}
          className="text-xs text-base-400"
        >
          {episode.overview || 'No synopsis available.'}
        </Text>
        {truncated && (
          <Pressable onPress={() => setExpanded((v) => !v)} accessibilityRole="button">
            <Text className="text-xs font-medium text-accent-400">{expanded ? 'Show less' : 'Show more'}</Text>
          </Pressable>
        )}

        <View className="mt-1.5 flex-row flex-wrap items-center gap-x-3 gap-y-1.5">
          {isUpcoming ? (
            <View className="rounded-full border border-hairline-strong px-3 py-1.5">
              <Text className="text-xs font-medium text-base-500">Airs {formatShortDate(episode.air_date!)}</Text>
            </View>
          ) : (
            <>
              <ActionPill
                icon={watched ? 'checkmark.circle.fill' : 'checkmark.circle'}
                active={watched}
                saving={saving}
                onPress={handleToggle}
                label={
                  watched
                    ? watchedAtUnknown
                      ? 'Watched a while ago'
                      : `Watched${watchedAt ? ` ${formatShortDate(watchedAt)}` : ''}`
                    : 'Mark watched'
                }
              />
              {!watched && (
                <DateMarkControl
                  label="Watched in the past"
                  onConfirm={(input) => onMarkWatchedWithDate(episode.episode_number, episode.name, episode.runtime, input)}
                />
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

export const EpisodeRow = memo(EpisodeRowImpl);

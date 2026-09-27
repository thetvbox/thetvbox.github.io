import { SymbolView } from 'expo-symbols';
import { Pressable, Text, View } from 'react-native';

import { DateMarkControl } from '@/components/date-mark-control';
import { formatShortDate } from '@/lib/date';
import { pluralSuffix } from '@/lib/format';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { ShowRewatch } from '@/types';

interface ShowDetailProgressProps {
  watchedCount: number;
  totalEpisodes: number;
  onMarkAllWatched: (input: { watchedAt: string; unknownDate: boolean }) => Promise<void>;
  rewatches: ShowRewatch[];
  onLogRewatch: (rewatchedAt: string) => Promise<void>;
  onDeleteRewatch: (id: string) => void;
}

/** Overall watch-progress bar, "mark it all watched" backfill control, and the rewatch log. */
export function ShowDetailProgress({
  watchedCount,
  totalEpisodes,
  onMarkAllWatched,
  rewatches,
  onLogRewatch,
  onDeleteRewatch,
}: ShowDetailProgressProps) {
  const finished = watchedCount >= totalEpisodes;
  const theme = useThemeColors();

  return (
    <View className="mt-4 max-w-xs">
      <View className="mb-1.5 flex-row items-center justify-between">
        <Text className="text-xs text-base-400">
          {watchedCount} / {totalEpisodes} episodes watched
        </Text>
        {finished && <Text className="text-xs text-accent-400">Finished</Text>}
      </View>
      <View className="h-1.5 w-full overflow-hidden rounded-full bg-base-800">
        <View className="h-full rounded-full bg-accent-500" style={{ width: `${Math.min(100, (watchedCount / totalEpisodes) * 100)}%` }} />
      </View>

      {!finished ? (
        <View className="mt-2 flex-row flex-wrap items-center gap-x-4 gap-y-1.5">
          <DateMarkControl
            label="Seen this before? Mark it all watched"
            onConfirm={onMarkAllWatched}
            confirmSummary={
              watchedCount > 0 ? `This will overwrite the date on ${watchedCount} already-watched episode${pluralSuffix(watchedCount)}.` : undefined
            }
          />
        </View>
      ) : (
        <View className="mt-2">
          <DateMarkControl
            label={rewatches.length > 0 ? `Log another rewatch (${rewatches.length} so far)` : 'Log a rewatch'}
            allowUnknownDate={false}
            onConfirm={(input) => onLogRewatch(input.watchedAt)}
          />
          {rewatches.length > 0 && (
            <View className="mt-1.5 flex-row flex-wrap gap-1.5">
              {rewatches.map((r) => (
                <View key={r.id} className="flex-row items-center gap-1 rounded-full bg-hover-strong px-2 py-0.5">
                  <Text className="text-[11px] text-base-400">{formatShortDate(r.rewatched_at)}</Text>
                  <Pressable onPress={() => onDeleteRewatch(r.id)} accessibilityRole="button" accessibilityLabel="Remove this rewatch">
                    <SymbolView name="xmark" size={10} tintColor={theme.textSecondary} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

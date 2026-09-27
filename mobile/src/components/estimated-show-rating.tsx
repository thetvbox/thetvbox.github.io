import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { pluralSuffix } from '@/lib/format';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { SeasonRatingWithUser } from '@/types';

interface EstimatedShowRatingProps {
  average: number;
  seasons: SeasonRatingWithUser[];
}

/** Live average of a show's rated seasons, shown until the user rates the show itself. */
export function EstimatedShowRating({ average, seasons }: EstimatedShowRatingProps) {
  const [open, setOpen] = useState(false);
  const theme = useThemeColors();

  return (
    <View className="mt-2">
      <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: open }} className="flex-row items-center gap-1">
        <SymbolView name="star.fill" size={13} tintColor={theme.star} />
        <Text className="text-xs text-base-300">
          ~{average.toFixed(1)} <Text className="text-base-500">({seasons.length} season{pluralSuffix(seasons.length)} rated)</Text>
        </Text>
      </Pressable>

      {open && (
        <View className="mt-2.5 max-w-xs gap-1.5 border-t border-hairline pt-2.5">
          {seasons
            .slice()
            .sort((a, b) => a.season_number - b.season_number)
            .map((s) => (
              <View key={s.id} className="flex-row items-center justify-between">
                <Text className="text-xs text-base-300">{s.season_name ?? `Season ${s.season_number}`}</Text>
                <View className="flex-row items-center gap-1">
                  <Text className="text-xs text-star">{s.rating.toFixed(1)}</Text>
                  <SymbolView name="star.fill" size={14} tintColor={theme.star} />
                </View>
              </View>
            ))}
        </View>
      )}
    </View>
  );
}

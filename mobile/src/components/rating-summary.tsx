import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { StarRating } from '@/components/star-rating';
import { profileHref } from '@/lib/navigation';
import { pluralSuffix } from '@/lib/format';
import { useThemeColors } from '@/hooks/use-theme-colors';

interface RatingEntry {
  id: string;
  user_id: string;
  rating: number;
  users: { username: string } | null;
}

interface RatingSummaryProps {
  ratings: RatingEntry[];
  myRating: number;
  onChange: (value: number) => void;
  saving?: boolean;
  currentUserId?: string;
  size?: 'sm' | 'md' | 'lg';
  emptyLabel?: string;
  ratingLabel: string;
}

/** Star input plus "here's what everyone else thought", shared by show- and season-level ratings. */
export function RatingSummary({
  ratings,
  myRating,
  onChange,
  saving = false,
  currentUserId,
  size = 'md',
  emptyLabel = "You're the first to rate this",
  ratingLabel,
}: RatingSummaryProps) {
  const [open, setOpen] = useState(false);
  const theme = useThemeColors();
  const others = ratings.filter((r) => r.user_id !== currentUserId);
  const othersAvg = others.length > 0 ? others.reduce((sum, r) => sum + r.rating, 0) / others.length : null;

  return (
    <View>
      <View className="flex-row flex-wrap items-center gap-x-4 gap-y-2">
        <StarRating value={myRating} onChange={onChange} size={size} label={ratingLabel} />
        {saving && <ActivityIndicator size="small" />}
        {myRating > 0 && (
          <Pressable onPress={() => onChange(0)} disabled={saving} accessibilityRole="button" accessibilityLabel="Clear your rating">
            <Text className="text-xs text-base-500 underline">Clear</Text>
          </Pressable>
        )}
        {ratings.length > 0 && (
          <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: open }} className="flex-row items-center gap-1">
            {othersAvg !== null ? (
              <>
                <SymbolView name="star.fill" size={14} tintColor={theme.star} />
                <Text className="text-xs text-base-400">
                  {othersAvg.toFixed(1)} <Text className="text-base-500">({others.length} other rating{pluralSuffix(others.length)})</Text>
                </Text>
              </>
            ) : (
              <Text className="text-xs text-base-500">{emptyLabel}</Text>
            )}
          </Pressable>
        )}
      </View>

      {open && ratings.length > 0 && (
        <View className="mt-2.5 max-w-xs gap-1.5 border-t border-hairline pt-2.5">
          {ratings
            .slice()
            .sort((a, b) => b.rating - a.rating)
            .map((r) => (
              <View key={r.id} className="flex-row items-center justify-between">
                {r.user_id === currentUserId ? (
                  <Text className="text-xs text-base-300">You</Text>
                ) : (
                  <Link href={profileHref(r.users?.username ?? '')} asChild>
                    <Pressable>
                      <Text className="text-xs text-base-300">@{r.users?.username ?? 'unknown'}</Text>
                    </Pressable>
                  </Link>
                )}
                <View className="flex-row items-center gap-1">
                  <Text className="text-xs text-star">{r.rating.toFixed(1)}</Text>
                  <SymbolView name="star.fill" size={14} tintColor={theme.star} />
                </View>
              </View>
            ))}
        </View>
      )}
    </View>
  );
}

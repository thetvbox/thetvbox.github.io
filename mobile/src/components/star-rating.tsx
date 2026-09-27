import { SymbolView } from 'expo-symbols';
import { Pressable, View } from 'react-native';

import { useThemeColors } from '@/hooks/use-theme-colors';
import { selectionHaptic } from '@/lib/haptics';
import { MAX_RATING, RATING_STEP } from '@/lib/constants';

const STAR_INDEXES = Array.from({ length: MAX_RATING }, (_, i) => i + 1);

const SIZE_MAP = { sm: 15, md: 20, lg: 28 } as const;

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: keyof typeof SIZE_MAP;
  readOnly?: boolean;
  label?: string;
}

/** One star, its fill drawn as a `star.fill` symbol clipped to the star's rated fraction over a dim `star` outline. */
function Star({ fill, px, tint, dimTint }: { fill: number; px: number; tint: string; dimTint: string }) {
  return (
    <View style={{ width: px, height: px }}>
      <SymbolView name="star" size={px} tintColor={dimTint} style={{ position: 'absolute' }} />
      {fill > 0 && (
        <View style={{ position: 'absolute', width: px * fill, height: px, overflow: 'hidden' }}>
          <SymbolView name="star.fill" size={px} tintColor={tint} />
        </View>
      )}
    </View>
  );
}

/** Tap-to-rate star row: the left half of a star picks the `.5` step, the right half the whole step. */
export function StarRating({ value, onChange, size = 'md', readOnly = false, label = 'Rate this' }: StarRatingProps) {
  const theme = useThemeColors();
  const px = SIZE_MAP[size];
  const interactive = !readOnly && Boolean(onChange);

  function handlePick(starIndex: number, half: boolean) {
    if (!interactive || !onChange) return;
    const picked = half ? starIndex - RATING_STEP : starIndex;
    selectionHaptic();
    onChange(picked === value ? 0 : picked);
  }

  return (
    <View
      className="flex-row items-center gap-[3px]"
      accessibilityRole={interactive ? 'adjustable' : undefined}
      accessibilityLabel={interactive ? label : `Rated ${value} out of ${MAX_RATING} stars`}
    >
      {STAR_INDEXES.map((starIndex) => {
        const fillForStar = Math.max(0, Math.min(1, value - (starIndex - 1)));
        return (
          <View key={starIndex} style={{ width: px, height: px }}>
            <Star fill={fillForStar} px={px} tint={theme.star} dimTint={theme.textSecondary} />
            {interactive && (
              <View className="absolute inset-0 flex-row">
                <Pressable
                  onPress={() => handlePick(starIndex, true)}
                  accessibilityRole="button"
                  accessibilityLabel={`${starIndex - RATING_STEP} stars`}
                  className="h-full flex-1"
                />
                <Pressable
                  onPress={() => handlePick(starIndex, false)}
                  accessibilityRole="button"
                  accessibilityLabel={`${starIndex} stars`}
                  className="h-full flex-1"
                />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

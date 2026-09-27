import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { PILL_ACTIVE_CLASSES, PILL_ACTIVE_TEXT_CLASSES, PILL_INACTIVE_CLASSES, PILL_INACTIVE_TEXT_CLASSES, PILL_SIZE_CLASSES } from '@/components/chip';
import { selectionHaptic } from '@/lib/haptics';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { SeasonSegment } from '@/lib/seasonProgress';
import type { TmdbSeasonSummary } from '@/types';

const SEASON_TAB_SCROLL_PADDING_PX = 16;

interface SeasonTabsProps {
  seasons: TmdbSeasonSummary[];
  active: number;
  onSelect: (seasonNumber: number) => void;
  segments?: SeasonSegment[];
}

/** Horizontally scrollable season chips, auto-scrolling the active one into view, with a checkmark on fully-watched seasons. */
export function SeasonTabs({ seasons, active, onSelect, segments = [] }: SeasonTabsProps) {
  const real = seasons.filter((s) => s.season_number > 0 || seasons.length === 1);
  const scrollRef = useRef<ScrollView>(null);
  const activeOffsetRef = useRef(0);
  const theme = useThemeColors();
  const segmentBySeasonNumber = useMemo(() => new Map(segments.map((s) => [s.seasonNumber, s])), [segments]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ x: Math.max(0, activeOffsetRef.current - SEASON_TAB_SCROLL_PADDING_PX), animated: true });
  }, [active]);

  return (
    <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {real.map((season) => {
        const isActive = season.season_number === active;
        const segment = segmentBySeasonNumber.get(season.season_number);
        const isComplete = Boolean(segment && segment.total > 0 && segment.watched >= segment.total);
        const label = season.season_number === 0 ? 'Specials' : `Season ${season.season_number}`;
        return (
          <View key={season.id} onLayout={(e) => isActive && (activeOffsetRef.current = e.nativeEvent.layout.x)}>
            <Pressable
              onPress={() => {
                selectionHaptic();
                onSelect(season.season_number);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              className={`shrink-0 flex-row items-center gap-1.5 ${PILL_SIZE_CLASSES} ${isActive ? PILL_ACTIVE_CLASSES : PILL_INACTIVE_CLASSES}`}
            >
              <Text className={isActive ? PILL_ACTIVE_TEXT_CLASSES : PILL_INACTIVE_TEXT_CLASSES}>{label}</Text>
              {isComplete && <SymbolView name="checkmark.circle.fill" size={13} tintColor={theme.accent} />}
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

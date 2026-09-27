import { SymbolView } from 'expo-symbols'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import { PickerSheet } from '@/components/picker-sheet'
import { PosterThumb } from '@/components/poster-thumb'
import { useThemeColors } from '@/hooks/use-theme-colors'
import { MAX_RATING, RATING_STEP } from '@/lib/constants'
import { pluralSuffix } from '@/lib/format'
import { showHref } from '@/lib/navigation'
import type { ShowRating } from '@/types'

const BUCKETS = Array.from({ length: MAX_RATING / RATING_STEP }, (_, i) => (i + 1) * RATING_STEP)
const BAR_ROW_HEIGHT = 64
const STAR_ICON_SIZE = 10

/** Rating histogram, one bar per half-star bucket; tapping a bar opens the shows behind it. */
export function RatingDistribution({ ratings }: { ratings: ShowRating[] }) {
  const [selected, setSelected] = useState<number | null>(null)
  const theme = useThemeColors()

  const { counts, byBucket, avg } = useMemo(() => {
    const c = new Array(BUCKETS.length).fill(0)
    const groups = new Map<number, ShowRating[]>()
    for (const r of ratings) {
      const idx = BUCKETS.indexOf(r.rating)
      if (idx === -1) continue
      c[idx]++
      const list = groups.get(r.rating)
      if (list) list.push(r)
      else groups.set(r.rating, [r])
    }
    const avg = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : null
    return { counts: c, byBucket: groups, avg }
  }, [ratings])

  if (ratings.length === 0) return null

  const max = Math.max(1, ...counts)
  const selectedShows = selected !== null ? (byBucket.get(selected) ?? []) : []

  function openShow(showId: number) {
    setSelected(null)
    router.push(showHref(showId))
  }

  return (
    <View className="mt-4">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-xs font-medium text-base-500">Ratings</Text>
        {avg !== null && (
          <View className="flex-row items-center gap-1">
            <Text className="text-xs font-medium text-base-300">{avg.toFixed(1)} avg</Text>
            <SymbolView name="star.fill" size={STAR_ICON_SIZE} tintColor={theme.star} />
          </View>
        )}
      </View>

      <View className="flex-row items-end gap-1" style={{ height: BAR_ROW_HEIGHT }}>
        {BUCKETS.map((b, i) => {
          const hasShows = counts[i] > 0
          const isSelected = selected === b
          return (
            <Pressable
              key={b}
              disabled={!hasShows}
              accessibilityRole="button"
              accessibilityLabel={`${counts[i]} show${pluralSuffix(counts[i])} rated ${b.toFixed(1)} stars`}
              accessibilityState={{ selected: isSelected, disabled: !hasShows }}
              onPress={() => setSelected((prev) => (prev === b ? null : b))}
              className="h-full flex-1 items-end justify-end"
            >
              <View
                className={`w-full rounded-t-sm ${isSelected ? 'bg-star' : 'bg-star/70'}`}
                style={{ height: `${counts[i] === 0 ? 3 : Math.max(10, (counts[i] / max) * 100)}%` }}
              />
            </Pressable>
          )
        })}
      </View>

      <View className="mt-1.5 flex-row items-center justify-between">
        <View className="flex-row items-center gap-1">
          <SymbolView name="star.fill" size={STAR_ICON_SIZE} tintColor={theme.star} />
          <Text className="text-[11px] text-base-500">{RATING_STEP}</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <SymbolView name="star.fill" size={STAR_ICON_SIZE} tintColor={theme.star} />
          <Text className="text-[11px] text-base-500">{MAX_RATING}</Text>
        </View>
      </View>

      <PickerSheet
        visible={selected !== null}
        title={
          selected !== null
            ? `${selected.toFixed(1)} stars · ${selectedShows.length} show${pluralSuffix(selectedShows.length)}`
            : ''
        }
        onClose={() => setSelected(null)}
      >
        <ScrollView className="flex-1">
          <View className="gap-1">
            {selectedShows.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => openShow(r.show_id)}
                accessibilityRole="link"
                className="flex-row items-center gap-2.5 rounded-lg p-1 active:opacity-70"
              >
                <PosterThumb posterPath={r.show_poster_path} size="sm" />
                <Text numberOfLines={1} className="min-w-0 flex-1 text-sm text-base-200">
                  {r.show_name}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </PickerSheet>
    </View>
  )
}

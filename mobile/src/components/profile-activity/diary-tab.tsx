import { SymbolView } from 'expo-symbols'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { EmptyState } from '@/components/empty-state'
import { PosterThumb } from '@/components/poster-thumb'
import { useThemeColors } from '@/hooks/use-theme-colors'
import { DIARY_PAGE_SIZE } from '@/lib/constants'
import { pluralSuffix } from '@/lib/format'
import { showDiaryHref, showHref } from '@/lib/navigation'
import { ROW_CARD_BASE_CLASSES } from '@/lib/rowCard'
import type { DiaryEntry } from '@/lib/showActivity'

export interface DiaryDayGroup {
  heading: string
  entries: DiaryEntry[]
}

interface DiaryTabProps {
  groups: DiaryDayGroup[]
  undatedEntries: DiaryEntry[]
  username: string
}

const KIND_ICON_SIZE = 11
const HISTORY_ICON_SIZE = 15

/** Truncates day-groups plus the trailing undated bucket to at most `limit` entries total, splitting the last group rather than cutting mid-day-heading. */
function sliceDiaryGroups(
  groups: DiaryDayGroup[],
  undatedEntries: DiaryEntry[],
  limit: number,
): { groups: DiaryDayGroup[]; undatedEntries: DiaryEntry[] } {
  const visibleGroups: DiaryDayGroup[] = []
  let remaining = limit
  for (const group of groups) {
    if (remaining <= 0) break
    if (group.entries.length <= remaining) {
      visibleGroups.push(group)
      remaining -= group.entries.length
    } else {
      visibleGroups.push({ heading: group.heading, entries: group.entries.slice(0, remaining) })
      remaining = 0
    }
  }
  return { groups: visibleGroups, undatedEntries: remaining > 0 ? undatedEntries.slice(0, remaining) : [] }
}

/** Diary tab body -- day-grouped entries, plus a trailing "date unknown" bucket, paginated. */
export function DiaryTab({ groups, undatedEntries, username }: DiaryTabProps) {
  const [visibleCount, setVisibleCount] = useState(DIARY_PAGE_SIZE)
  const theme = useThemeColors()

  const totalCount = useMemo(
    () => groups.reduce((sum, g) => sum + g.entries.length, 0) + undatedEntries.length,
    [groups, undatedEntries],
  )
  const visible = useMemo(
    () => sliceDiaryGroups(groups, undatedEntries, visibleCount),
    [groups, undatedEntries, visibleCount],
  )

  if (totalCount === 0) {
    return (
      <EmptyState icon="📔">
        <Text className="max-w-xs text-center text-sm text-base-500">
          Nothing logged yet. Mark an episode watched or rate a show, and it&apos;ll show up here.{' '}
          <Text className="text-accent-400" onPress={() => router.push('/search')}>
            Find a show
          </Text>{' '}
          to get started.
        </Text>
      </EmptyState>
    )
  }

  return (
    <View className="gap-6">
      {visible.groups.map((group) => (
        <View key={group.heading + group.entries[0].id}>
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-500">{group.heading}</Text>
          <View className="gap-2">
            {group.entries.map((entry) => (
              <DiaryRow key={entry.id} entry={entry} username={username} theme={theme} />
            ))}
          </View>
        </View>
      ))}

      {visible.undatedEntries.length > 0 && (
        <View>
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-500">Date unknown</Text>
          <View className="gap-2">
            {visible.undatedEntries.map((entry) => (
              <DiaryRow key={entry.id} entry={entry} username={username} theme={theme} />
            ))}
          </View>
        </View>
      )}

      {visibleCount < totalCount && (
        <Pressable
          onPress={() => setVisibleCount((c) => c + DIARY_PAGE_SIZE)}
          accessibilityRole="button"
          className="items-center rounded-xl border border-hairline bg-base-850/60 py-2.5 active:bg-base-800/70"
        >
          <Text className="text-sm font-medium text-base-300">Show more ({totalCount - visibleCount} left)</Text>
        </Pressable>
      )}
    </View>
  )
}

function DiaryRow({
  entry,
  username,
  theme,
}: {
  entry: DiaryEntry
  username: string
  theme: ReturnType<typeof useThemeColors>
}) {
  return (
    <View className={`flex-row items-center gap-1.5 ${ROW_CARD_BASE_CLASSES}`}>
      <Pressable
        onPress={() => router.push(showHref(entry.showId))}
        accessibilityRole="link"
        className="min-w-0 flex-1 flex-row items-center gap-3"
      >
        <PosterThumb posterPath={entry.showPosterPath} />
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-sm font-medium text-base-100">
            {entry.showName}
          </Text>
          <View className="flex-row items-center gap-1">
            {entry.kind === 'rated' && <Text className="text-xs text-base-400">Rated</Text>}
            {entry.kind === 'rewatched' && (
              <>
                <SymbolView name="arrow.triangle.2.circlepath" size={KIND_ICON_SIZE} tintColor={theme.accent} />
                <Text className="text-xs text-base-400">Rewatched</Text>
              </>
            )}
            {entry.kind === 'watched' && (
              <>
                <SymbolView name="checkmark" size={KIND_ICON_SIZE} tintColor={theme.accent} />
                <Text className="text-xs text-base-400">
                  {entry.episodeLabel
                    ? `Watched ${entry.episodeLabel}`
                    : `Watched ${entry.episodeCount} episode${pluralSuffix(entry.episodeCount)}${
                        entry.seasonLabel ? ` · ${entry.seasonLabel}` : ''
                      }`}
                </Text>
              </>
            )}
          </View>
        </View>
        {entry.rating != null && (
          <View className="shrink-0 flex-row items-center gap-1">
            <Text className="text-sm font-semibold text-star">{entry.rating.toFixed(1)}</Text>
            <SymbolView name="star.fill" size={KIND_ICON_SIZE} tintColor={theme.star} />
          </View>
        )}
      </Pressable>
      <Pressable
        onPress={() => router.push(showDiaryHref(username, entry.showId))}
        accessibilityRole="link"
        accessibilityLabel="View this show's full diary"
        className="h-8 w-8 shrink-0 items-center justify-center rounded-lg active:bg-hover"
      >
        <SymbolView name="clock.arrow.circlepath" size={HISTORY_ICON_SIZE} tintColor={theme.textSecondary} />
      </Pressable>
    </View>
  )
}

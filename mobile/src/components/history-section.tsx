import { Image } from 'expo-image'
import { SymbolView } from 'expo-symbols'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { EmptyState } from '@/components/empty-state'
import { HistoryFiltersSheet } from '@/components/history-filters-sheet'
import { PILL_ACTIVE_CLASSES, PILL_ACTIVE_TEXT_CLASSES, PILL_SIZE_CLASSES } from '@/components/chip'
import { PosterGrid } from '@/components/poster-grid'
import { PosterTile } from '@/components/poster-tile'
import { ShowGridSkeleton } from '@/components/skeletons'
import { StreamingBadge } from '@/components/streaming-badge'
import { useShowDetails } from '@/hooks/useShowDetails'
import { useStreamingPlatforms } from '@/hooks/useStreamingPlatforms'
import { useThemeColors } from '@/hooks/use-theme-colors'
import { formatShortDate } from '@/lib/date'
import { showDiaryHref } from '@/lib/navigation'
import type { HistorySort, ShowActivity } from '@/lib/showActivity'
import { sortHistory } from '@/lib/showActivity'
import {
  buildHistoryFilterFacets,
  countActiveHistoryFilters,
  emptyHistoryFilters,
  filterHistory,
  isHistoryFiltersActive,
} from '@/lib/historyFilters'
import type { HistoryFilters } from '@/lib/historyFilters'
import { providerLogoUrl } from '@/lib/tmdb'
import type { ResolvedProvider } from '@/lib/streamingProvider'

const SORT_LABELS: Record<HistorySort, string> = {
  recent: 'Recent',
  rating: 'Top rated',
  finished: 'Finished',
  name: 'A–Z',
  platform: 'Platform',
}

const SORT_KEYS = Object.keys(SORT_LABELS) as HistorySort[]
const NOT_STREAMING_LABEL = 'Not free to stream'
const STAR_ICON_SIZE = 10

interface HistorySectionProps {
  activity: ShowActivity[]
  username: string
  emptyIcon?: string
  emptyMessage: string
}

/** History tab body: sort pills, the 7-facet filter sheet, and a poster grid (flat or grouped by streaming platform). */
export function HistorySection({ activity, username, emptyIcon = '✅', emptyMessage }: HistorySectionProps) {
  const [sort, setSort] = useState<HistorySort>('recent')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<HistoryFilters>(emptyHistoryFilters)
  const theme = useThemeColors()

  const showIds = useMemo(() => activity.map((s) => s.showId), [activity])
  const { platforms, platformNames, loading: loadingPlatforms } = useStreamingPlatforms(showIds)
  const detailsEnabled = filtersOpen || isHistoryFiltersActive(filters)
  const { details, loading: loadingDetails } = useShowDetails(showIds, detailsEnabled)

  const facets = useMemo(
    () => buildHistoryFilterFacets(activity, details, platformNames),
    [activity, details, platformNames],
  )
  const filteredActivity = useMemo(
    () => filterHistory(activity, filters, details, platformNames),
    [activity, filters, details, platformNames],
  )

  const flatSorted = useMemo(
    () => (sort === 'platform' ? [] : sortHistory(filteredActivity, sort)),
    [filteredActivity, sort],
  )

  const groupedByPlatform = useMemo(() => {
    if (sort !== 'platform') return null
    const groups = new Map<string, { provider: ResolvedProvider | null; shows: ShowActivity[] }>()
    for (const s of filteredActivity) {
      const provider = platforms.get(s.showId) ?? null
      const key = provider ? provider.provider_name : NOT_STREAMING_LABEL
      let group = groups.get(key)
      if (!group) {
        group = { provider, shows: [] }
        groups.set(key, group)
      }
      group.shows.push(s)
    }
    return Array.from(groups.entries())
      .map(([name, g]) => ({ name, ...g }))
      .sort((a, b) => {
        if (a.name === NOT_STREAMING_LABEL) return 1
        if (b.name === NOT_STREAMING_LABEL) return -1
        return a.name.localeCompare(b.name)
      })
  }, [sort, platforms, filteredActivity])

  if (activity.length === 0) {
    return (
      <EmptyState icon={emptyIcon}>
        <Text className="max-w-xs text-center text-sm text-base-500">{emptyMessage}</Text>
      </EmptyState>
    )
  }

  const activeFilterCount = countActiveHistoryFilters(filters)

  return (
    <View>
      <View className="mb-4 flex-row flex-wrap items-center justify-between gap-2">
        <View className="flex-row flex-wrap items-center gap-1.5">
          {SORT_KEYS.map((key) => (
            <Pressable
              key={key}
              onPress={() => setSort(key)}
              accessibilityRole="button"
              accessibilityState={{ selected: sort === key }}
              className={`${PILL_SIZE_CLASSES} ${sort === key ? PILL_ACTIVE_CLASSES : ''}`}
            >
              <Text className={sort === key ? PILL_ACTIVE_TEXT_CLASSES : 'text-sm font-medium text-base-500'}>
                {SORT_LABELS[key]}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={() => setFiltersOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Filters"
          accessibilityState={{ selected: filtersOpen || activeFilterCount > 0 }}
          className={`shrink-0 ${PILL_SIZE_CLASSES} ${filtersOpen || activeFilterCount > 0 ? PILL_ACTIVE_CLASSES : ''}`}
        >
          <Text
            className={
              filtersOpen || activeFilterCount > 0 ? PILL_ACTIVE_TEXT_CLASSES : 'text-sm font-medium text-base-500'
            }
          >
            Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
          </Text>
        </Pressable>
      </View>

      <HistoryFiltersSheet
        visible={filtersOpen}
        facets={facets}
        filters={filters}
        onChange={setFilters}
        loadingDetails={loadingDetails}
        onClose={() => setFiltersOpen(false)}
      />

      {filteredActivity.length === 0 ? (
        <EmptyState icon="🔍" className="mt-4">
          <Text className="max-w-xs text-center text-sm text-base-500">No shows match these filters.</Text>
          <Pressable onPress={() => setFilters(emptyHistoryFilters())} accessibilityRole="button" className="mt-3">
            <Text className="text-xs text-accent-400">Clear filters</Text>
          </Pressable>
        </EmptyState>
      ) : sort === 'platform' ? (
        loadingPlatforms && platforms.size === 0 ? (
          <ShowGridSkeleton />
        ) : (
        <View className="gap-8">
          {groupedByPlatform?.map((group) => (
            <View key={group.name}>
              <View className="mb-3 flex-row items-center gap-2">
                {group.provider && providerLogoUrl(group.provider.logo_path) && (
                  <View className="h-6 w-6 shrink-0 overflow-hidden rounded ring-1 ring-hairline-strong">
                    <Image
                      source={{ uri: providerLogoUrl(group.provider.logo_path) ?? undefined }}
                      contentFit="cover"
                      style={{ flex: 1 }}
                    />
                  </View>
                )}
                <Text className="text-xs font-semibold uppercase tracking-wide text-base-500">
                  {group.name} <Text className="text-base-600">· {group.shows.length}</Text>
                </Text>
              </View>
              <PosterGrid
                data={group.shows}
                keyExtractor={(s) => String(s.showId)}
                renderItem={(s) => (
                  <HistoryCard show={s} username={username} provider={platforms.get(s.showId)} theme={theme} />
                )}
              />
            </View>
          ))}
        </View>
        )
      ) : (
        <PosterGrid
          data={flatSorted}
          keyExtractor={(s) => String(s.showId)}
          renderItem={(s) => (
            <HistoryCard show={s} username={username} provider={platforms.get(s.showId)} theme={theme} />
          )}
        />
      )}
    </View>
  )
}

function HistoryCard({
  show: s,
  username,
  provider,
  theme,
}: {
  show: ShowActivity
  username: string
  provider?: ResolvedProvider | null
  theme: ReturnType<typeof useThemeColors>
}) {
  return (
    <Pressable
      onPress={() => router.push(showDiaryHref(username, s.showId))}
      accessibilityRole="link"
      accessibilityLabel={s.showName}
      className="active:opacity-80"
    >
      <PosterTile posterPath={s.showPosterPath} name={s.showName}>
        <StreamingBadge provider={provider} />
        <View className="absolute inset-x-0 bottom-0 px-2 pb-1.5 pt-4">
          {s.rating !== null ? (
            <View className="flex-row items-center gap-1">
              <Text className="text-[11px] font-semibold text-star">{s.rating.toFixed(1)}</Text>
              <SymbolView name="star.fill" size={STAR_ICON_SIZE} tintColor={theme.star} />
            </View>
          ) : (
            <Text className="text-[11px] font-semibold text-accent-400">Finished</Text>
          )}
        </View>
      </PosterTile>
      <Text numberOfLines={1} className="mt-2 text-sm font-medium text-base-100">
        {s.showName}
      </Text>
      <Text className="text-xs text-base-400">
        {s.finishedAt
          ? s.finishedAtUnknown
            ? 'Watched a while ago'
            : formatShortDate(s.finishedAt)
          : s.ratedAt
            ? formatShortDate(s.ratedAt)
            : ''}
      </Text>
    </Pressable>
  )
}

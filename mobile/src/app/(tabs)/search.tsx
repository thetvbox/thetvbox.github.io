import { FlashList } from '@shopify/flash-list'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EmptyState } from '@/components/empty-state'
import { ErrorText } from '@/components/error-text'
import { ShowCard } from '@/components/show-card'
import { ShowGridSkeleton } from '@/components/skeletons'
import { useSearch } from '@/contexts/SearchContext'
import { BottomTabInset } from '@/constants/theme'
import { POSTER_GRID_COLUMNS, POSTER_GRID_GAP_PX } from '@/lib/constants'
import { isTmdbConfigured } from '@/lib/tmdb'
import type { TmdbShowSummary } from '@/types'

const SEARCH_BOTTOM_PADDING = BottomTabInset + 40

export default function SearchScreen() {
  const { query, searching, loading, error, hasSearched, filteredShows, platformFor, trendingResults } = useSearch()

  const showTrendingChrome = !searching
  const showTrendingHeader = showTrendingChrome && trendingResults.length > 0

  const listHeader = (
    <View className="gap-4 pb-2">
      {!isTmdbConfigured && (
        <View className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2">
          <Text className="text-xs text-warning">
            TMDB isn&apos;t configured yet -- search won&apos;t return results until it is.
          </Text>
        </View>
      )}
      {error && <ErrorText>{error}</ErrorText>}
      {showTrendingChrome && (
        <Text className="text-center text-sm text-base-500">
          Search for any TV show to mark as now watching, add to watchlist or rate per season.
        </Text>
      )}
      {showTrendingHeader && (
        <Text accessibilityRole="header" className="text-lg font-semibold text-base-100">
          Trending this week
        </Text>
      )}
    </View>
  )

  const emptyMessage = searching
    ? hasSearched && !error
      ? `No shows found for "${query}".`
      : null
    : showTrendingHeader
      ? 'No trending shows match the selected filters.'
      : null

  return (
    <View className="flex-1 bg-base-950">
      <SafeAreaView edges={['left', 'right']} className="flex-1">
        {loading ? (
          <View className="flex-1 px-4 pt-4">
            <ShowGridSkeleton />
          </View>
        ) : (
          <FlashList<TmdbShowSummary>
            data={filteredShows}
            numColumns={POSTER_GRID_COLUMNS}
            keyExtractor={(show) => String(show.id)}
            renderItem={({ item }) => (
              <View className="flex-1 p-2">
                <ShowCard show={item} provider={platformFor(item.id)} />
              </View>
            )}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={
              emptyMessage ? (
                <EmptyState icon="🔍">
                  <Text className="text-center text-sm text-base-500">{emptyMessage}</Text>
                </EmptyState>
              ) : null
            }
            contentContainerStyle={{ padding: 16 - POSTER_GRID_GAP_PX / 4, paddingBottom: SEARCH_BOTTOM_PADDING }}
          />
        )}
      </SafeAreaView>
    </View>
  )
}

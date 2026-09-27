import { GlassView } from 'expo-glass-effect'
import { router, Stack } from 'expo-router'
import { Pressable, ScrollView, Text, View } from 'react-native'

import { ChipGroup, FilterSection } from '@/components/filter-section'
import { useSearch } from '@/contexts/SearchContext'
import { emptySearchFilters } from '@/lib/searchFilters'

/** Native form-sheet route for Search's platform + genre filters -- registered with `presentation: 'formSheet'` in the root layout. */
export default function SearchFiltersScreen() {
  const { facets, filters, filterCounts, toggleFilter, setFilters, filtersActive } = useSearch()

  return (
    <GlassView glassEffectStyle="regular" style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
        <Text accessibilityRole="header" className="text-base font-semibold text-base-100">
          Filters
        </Text>
        <View className="flex-row items-center gap-5">
          {filtersActive && (
            <Pressable
              onPress={() => setFilters(emptySearchFilters())}
              accessibilityRole="button"
              accessibilityLabel="Clear all filters"
            >
              <Text className="text-sm font-medium text-accent-400">Clear all</Text>
            </Pressable>
          )}
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Done">
            <Text className="text-sm font-semibold text-accent-400">Done</Text>
          </Pressable>
        </View>
      </View>
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
        {facets.platforms.length > 0 && (
          <FilterSection title="Platform" first>
            <ChipGroup
              options={facets.platforms}
              selected={filters.platforms}
              onToggle={(v) => toggleFilter('platforms', v)}
              counts={filterCounts.platforms}
            />
          </FilterSection>
        )}
        {facets.genres.length > 0 && (
          <FilterSection title="Genre" first={facets.platforms.length === 0}>
            <ChipGroup
              options={facets.genres}
              selected={filters.genres}
              onToggle={(v) => toggleFilter('genres', v)}
              counts={filterCounts.genres}
            />
          </FilterSection>
        )}
      </ScrollView>
    </GlassView>
  )
}

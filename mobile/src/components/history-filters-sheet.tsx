import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'

import { Chip } from '@/components/chip'
import { ChipGroup, FilterSection } from '@/components/filter-section'
import { PickerSheet } from '@/components/picker-sheet'
import { useThemeColors } from '@/hooks/use-theme-colors'
import { FILTER_DEBOUNCE_MS } from '@/lib/constants'
import {
  emptyHistoryFilters,
  isHistoryFiltersActive,
  type HistoryFilterFacets,
  type HistoryFilters,
} from '@/lib/historyFilters'

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' })
const languageNames = new Intl.DisplayNames(['en'], { type: 'language' })

function countryLabel(code: string): string {
  try {
    return countryNames.of(code) ?? code
  } catch {
    return code
  }
}

function languageLabel(code: string): string {
  try {
    return languageNames.of(code) ?? code
  } catch {
    return code
  }
}

const RATED_LABELS = { any: 'All', rated: 'Rated', unrated: 'Unrated' } as const
const MIN_RATING_OPTIONS = [1, 2, 3, 4, 5]

interface HistoryFiltersSheetProps {
  visible: boolean
  facets: HistoryFilterFacets
  filters: HistoryFilters
  onChange: (filters: HistoryFilters) => void
  loadingDetails: boolean
  onClose: () => void
}

/** Full 7-facet History filters sheet: rating, genre, year range, platform, status, country, and language. */
export function HistoryFiltersSheet({
  visible,
  facets,
  filters,
  onChange,
  loadingDetails,
  onClose,
}: HistoryFiltersSheetProps) {
  function toggleSetValue(key: 'genres' | 'countries' | 'languages' | 'platforms' | 'statuses', value: string) {
    const next = new Set(filters[key])
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange({ ...filters, [key]: next })
  }

  return (
    <PickerSheet
      visible={visible}
      title="Filters"
      onClose={onClose}
      headerActions={
        isHistoryFiltersActive(filters) ? (
          <Pressable
            onPress={() => onChange(emptyHistoryFilters())}
            accessibilityRole="button"
            accessibilityLabel="Clear all filters"
          >
            <Text className="text-sm font-medium text-accent-400">Clear all</Text>
          </Pressable>
        ) : undefined
      }
    >
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        <FilterSection title="Rating" first>
          <View className="flex-row flex-wrap gap-1.5">
            {(Object.keys(RATED_LABELS) as (keyof typeof RATED_LABELS)[]).map((r) => (
              <Chip
                key={r}
                active={filters.rated === r}
                onPress={() => onChange({ ...filters, rated: r, minRating: r === 'rated' ? filters.minRating : null })}
              >
                {RATED_LABELS[r]}
              </Chip>
            ))}
          </View>
          {filters.rated === 'rated' && (
            <View className="mt-2 flex-row flex-wrap items-center gap-1">
              <Text className="mr-1 text-[11px] text-base-500">At least</Text>
              {MIN_RATING_OPTIONS.map((n) => (
                <Chip
                  key={n}
                  active={filters.minRating === n}
                  onPress={() => onChange({ ...filters, minRating: filters.minRating === n ? null : n })}
                >
                  {n}+★
                </Chip>
              ))}
            </View>
          )}
        </FilterSection>

        {facets.genres.length > 0 && (
          <FilterSection title="Genre">
            <ChipGroup options={facets.genres} selected={filters.genres} onToggle={(v) => toggleSetValue('genres', v)} />
          </FilterSection>
        )}

        {facets.minYear !== null && facets.maxYear !== null && (
          <FilterSection title="Year">
            <YearRangeFilter
              minYear={facets.minYear}
              maxYear={facets.maxYear}
              yearFrom={filters.yearFrom}
              yearTo={filters.yearTo}
              onChange={(next) => onChange({ ...filters, ...next })}
            />
          </FilterSection>
        )}

        {facets.platforms.length > 0 && (
          <FilterSection title="Platform">
            <ChipGroup
              options={facets.platforms}
              selected={filters.platforms}
              onToggle={(v) => toggleSetValue('platforms', v)}
            />
          </FilterSection>
        )}

        {facets.statuses.length > 0 && (
          <FilterSection title="Status">
            <ChipGroup
              options={facets.statuses}
              selected={filters.statuses}
              onToggle={(v) => toggleSetValue('statuses', v)}
            />
          </FilterSection>
        )}

        {facets.countries.length > 0 && (
          <FilterSection title="Country">
            <ChipGroup
              options={facets.countries}
              selected={filters.countries}
              onToggle={(v) => toggleSetValue('countries', v)}
              labelFor={countryLabel}
            />
          </FilterSection>
        )}

        {facets.languages.length > 0 && (
          <FilterSection title="Language">
            <ChipGroup
              options={facets.languages}
              selected={filters.languages}
              onToggle={(v) => toggleSetValue('languages', v)}
              labelFor={languageLabel}
            />
          </FilterSection>
        )}

        {loadingDetails && <Text className="mt-3 text-[11px] text-base-600">Loading more filter options…</Text>}
      </ScrollView>
    </PickerSheet>
  )
}

/** Free-typed year bounds, committed to the real filter only after a pause in typing. */
function YearRangeFilter({
  minYear,
  maxYear,
  yearFrom,
  yearTo,
  onChange,
}: {
  minYear: number
  maxYear: number
  yearFrom: number | null
  yearTo: number | null
  onChange: (next: { yearFrom: number | null; yearTo: number | null }) => void
}) {
  const [fromText, setFromText] = useState(yearFrom === null ? '' : String(yearFrom))
  const [toText, setToText] = useState(yearTo === null ? '' : String(yearTo))
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const theme = useThemeColors()

  const [prevYearFrom, setPrevYearFrom] = useState(yearFrom)
  if (yearFrom !== prevYearFrom) {
    setPrevYearFrom(yearFrom)
    setFromText(yearFrom === null ? '' : String(yearFrom))
  }
  const [prevYearTo, setPrevYearTo] = useState(yearTo)
  if (yearTo !== prevYearTo) {
    setPrevYearTo(yearTo)
    setToText(yearTo === null ? '' : String(yearTo))
  }

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    },
    [],
  )

  function scheduleCommit(nextFromText: string, nextToText: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onChange({
        yearFrom: nextFromText.trim() === '' ? null : Number(nextFromText),
        yearTo: nextToText.trim() === '' ? null : Number(nextToText),
      })
    }, FILTER_DEBOUNCE_MS)
  }

  return (
    <View className="flex-row items-center gap-2">
      <TextInput
        keyboardType="number-pad"
        accessibilityLabel="From year"
        placeholder={String(minYear)}
        placeholderTextColor={theme.textSecondary}
        value={fromText}
        onChangeText={(text) => {
          setFromText(text)
          scheduleCommit(text, toText)
        }}
        className="w-20 rounded-lg border border-hairline-strong bg-base-950 px-2 py-1 text-xs text-base-200"
      />
      <Text className="text-xs text-base-500">to</Text>
      <TextInput
        keyboardType="number-pad"
        accessibilityLabel="To year"
        placeholder={String(maxYear)}
        placeholderTextColor={theme.textSecondary}
        value={toText}
        onChangeText={(text) => {
          setToText(text)
          scheduleCommit(fromText, text)
        }}
        className="w-20 rounded-lg border border-hairline-strong bg-base-950 px-2 py-1 text-xs text-base-200"
      />
    </View>
  )
}

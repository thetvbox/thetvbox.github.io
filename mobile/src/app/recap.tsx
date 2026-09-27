import { Link, Stack } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Chip } from '@/components/chip'
import { EmptyState } from '@/components/empty-state'
import { PosterThumb } from '@/components/poster-thumb'
import { StatCard } from '@/components/stat-card'
import { useAuth } from '@/contexts/AuthContext'
import { useThemeColors } from '@/hooks/use-theme-colors'
import { BottomTabInset } from '@/constants/theme'
import { LARGE_ACTIVITY_FETCH_LIMIT, SKELETON_ROWS_WIDE } from '@/lib/constants'
import { errorMessage } from '@/lib/format'
import { showHref } from '@/lib/navigation'
import { availableRecapYears, buildYearRecap } from '@/lib/recap'
import { fetchRecentRewatches } from '@/lib/rewatches'
import { summarizeShowActivity } from '@/lib/showActivity'
import { fetchRecentShowRatings } from '@/lib/showRatings'
import { fetchRecentWatched } from '@/lib/watched'
import type { EpisodeWatched, ShowRating, ShowRewatch } from '@/types'

const RECAP_BOTTOM_PADDING = BottomTabInset + 40

/** Year-in-review stats -- shows finished, episodes/hours watched, ratings, top-rated pick -- ported from web's Recap.tsx. */
export default function RecapScreen() {
  const { user } = useAuth()
  const theme = useThemeColors()
  const [ratings, setRatings] = useState<ShowRating[]>([])
  const [watched, setWatched] = useState<EpisodeWatched[]>([])
  const [rewatches, setRewatches] = useState<ShowRewatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [year, setYear] = useState<number | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(null)
    Promise.all([
      fetchRecentShowRatings(user.id, LARGE_ACTIVITY_FETCH_LIMIT),
      fetchRecentWatched(user.id, LARGE_ACTIVITY_FETCH_LIMIT),
      fetchRecentRewatches(user.id, LARGE_ACTIVITY_FETCH_LIMIT),
    ])
      .then(([r, w, rw]) => {
        if (cancelled) return
        setRatings(r)
        setWatched(w)
        setRewatches(rw)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err, 'Failed to load your recap.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const years = useMemo(() => availableRecapYears(ratings, watched, rewatches), [ratings, watched, rewatches])
  const selectedYear = year !== null && years.includes(year) ? year : (years[0] ?? null)
  const activity = useMemo(() => summarizeShowActivity(ratings, watched), [ratings, watched])
  const recap = useMemo(() => {
    if (selectedYear === null) return null
    return buildYearRecap(selectedYear, activity, ratings, watched, rewatches)
  }, [selectedYear, activity, ratings, watched, rewatches])

  return (
    <View className="flex-1 bg-base-950">
      <Stack.Screen options={{ title: selectedYear ? `${selectedYear} Year in Review` : 'Year in Review' }} />
      <SafeAreaView edges={['bottom']} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: RECAP_BOTTOM_PADDING }}>
          {years.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} className="mb-6">
              {years.map((y) => (
                <Chip key={y} active={selectedYear === y} onPress={() => setYear(y)}>
                  {String(y)}
                </Chip>
              ))}
            </ScrollView>
          )}

          {loading ? (
            <View className="gap-3">
              {Array.from({ length: Math.ceil(SKELETON_ROWS_WIDE / 2) }).map((_, row) => (
                <View key={row} className="flex-row gap-3">
                  <View className="h-20 flex-1 rounded-xl bg-base-850/70" />
                  <View className="h-20 flex-1 rounded-xl bg-base-850/70" />
                </View>
              ))}
            </View>
          ) : error || !recap || years.length === 0 ? (
            <EmptyState icon={error ? '⚠️' : '🎬'}>
              <Text className="max-w-xs text-center text-sm text-base-500">
                {error ?? 'Nothing tracked yet.'}
              </Text>
              {!error && (
                <Link href="/search" asChild>
                  <Pressable accessibilityRole="link" accessibilityLabel="Find a show" className="mt-2">
                    <Text className="text-sm text-accent-400">Find a show</Text>
                  </Pressable>
                </Link>
              )}
            </EmptyState>
          ) : (
            <>
              <View className="gap-3">
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <StatCard label="Shows finished" value={recap.showsFinished} />
                  </View>
                  <View className="flex-1">
                    <StatCard label="Episodes watched" value={recap.episodesWatched} />
                  </View>
                </View>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <StatCard label="Hours watched" value={recap.hoursWatched} />
                  </View>
                  <View className="flex-1">
                    <StatCard label="Ratings given" value={recap.ratingsGiven} />
                  </View>
                </View>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <StatCard label="Avg rating" value={recap.avgRating !== null ? recap.avgRating.toFixed(1) : '—'} />
                  </View>
                  <View className="flex-1">
                    <StatCard label="Rewatches" value={recap.rewatches} />
                  </View>
                </View>
              </View>

              {recap.mostActiveMonth && (
                <Text className="mt-4 text-sm text-base-400">
                  Busiest month: <Text className="text-base-200">{recap.mostActiveMonth}</Text>
                </Text>
              )}

              {recap.topRated && (
                <View className="mt-8">
                  <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-base-400">Top rated</Text>
                  <Link href={showHref(recap.topRated.showId)} asChild>
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel={recap.topRated.showName}
                      className="flex-row items-center gap-3 rounded-xl border border-hairline bg-base-850/60 p-2.5 active:opacity-80"
                    >
                      <PosterThumb posterPath={recap.topRated.showPosterPath} size="lg" />
                      <View className="min-w-0 flex-1">
                        <Text numberOfLines={1} className="text-sm font-medium text-base-100">
                          {recap.topRated.showName}
                        </Text>
                      </View>
                      <View className="shrink-0 flex-row items-center gap-1">
                        <Text className="text-sm font-semibold text-star">{recap.topRated.rating.toFixed(1)}</Text>
                        <SymbolView name="star.fill" size={14} tintColor={theme.star} />
                      </View>
                    </Pressable>
                  </Link>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

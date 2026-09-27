import { Link, Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EmptyState } from '@/components/empty-state'
import { ErrorText } from '@/components/error-text'
import { PosterThumb } from '@/components/poster-thumb'
import { StatCard } from '@/components/stat-card'
import { useAuth } from '@/contexts/AuthContext'
import { BottomTabInset } from '@/constants/theme'
import { LARGE_ACTIVITY_FETCH_LIMIT, MAX_RATING_DIFF, SKELETON_ROWS } from '@/lib/constants'
import { errorMessage } from '@/lib/format'
import { showHref } from '@/lib/navigation'
import { fetchRecentShowRatings } from '@/lib/showRatings'
import { fetchUserByUsername } from '@/lib/users'
import type { AppUser, ShowRating } from '@/types'

const COMPARE_BOTTOM_PADDING = BottomTabInset + 40

interface SharedShow {
  showId: number
  showName: string
  showPosterPath: string | null
  mine: number
  theirs: number
  diff: number
}

/** Taste-compare against another member: shared shows sorted by biggest rating difference first -- ported from web's Compare.tsx. */
export default function CompareScreen() {
  const { username } = useLocalSearchParams<{ username: string }>()
  const { user: me } = useAuth()
  const [them, setThem] = useState<AppUser | null | undefined>(undefined)
  const [myRatings, setMyRatings] = useState<ShowRating[]>([])
  const [theirRatings, setTheirRatings] = useState<ShowRating[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!username || !me) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThem(undefined)
    setLoading(true)
    fetchUserByUsername(username)
      .then(async (found) => {
        if (cancelled) return
        setThem(found)
        if (found) {
          const [mine, theirs] = await Promise.all([
            fetchRecentShowRatings(me.id, LARGE_ACTIVITY_FETCH_LIMIT),
            fetchRecentShowRatings(found.id, LARGE_ACTIVITY_FETCH_LIMIT),
          ])
          if (!cancelled) {
            setMyRatings(mine)
            setTheirRatings(theirs)
          }
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err, 'Failed to load comparison.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [username, me])

  const { shared, matchPercent } = useMemo(() => {
    const theirMap = new Map(theirRatings.map((r) => [r.show_id, r]))
    const rows: SharedShow[] = []
    for (const mine of myRatings) {
      const theirs = theirMap.get(mine.show_id)
      if (!theirs) continue
      const diff = Math.abs(mine.rating - theirs.rating)
      rows.push({
        showId: mine.show_id,
        showName: mine.show_name,
        showPosterPath: mine.show_poster_path,
        mine: mine.rating,
        theirs: theirs.rating,
        diff,
      })
    }
    rows.sort((a, b) => b.diff - a.diff)

    const match =
      rows.length === 0
        ? null
        : Math.round(
            (rows.reduce((sum, r) => sum + (1 - Math.min(r.diff / MAX_RATING_DIFF, 1)), 0) / rows.length) * 100,
          )

    return { shared: rows, matchPercent: match }
  }, [myRatings, theirRatings])

  if (me && username === me.username) {
    return (
      <View className="flex-1 items-center justify-center bg-base-950 px-6">
        <Stack.Screen options={{ title: 'Compare' }} />
        <ErrorText className="text-center text-sm">You can&apos;t compare with yourself.</ErrorText>
      </View>
    )
  }

  if (them === null) {
    return (
      <View className="flex-1 items-center justify-center bg-base-950 px-6">
        <Stack.Screen options={{ title: 'Compare' }} />
        <ErrorText className="text-center text-sm">{`No one found with username "${username}".`}</ErrorText>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-base-950">
      <Stack.Screen options={{ title: `You vs @${username}` }} />
      <SafeAreaView edges={['bottom']} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: COMPARE_BOTTOM_PADDING }}>
          <Text className="mb-6 text-sm text-base-500">How your ratings stack up on shows you&apos;ve both rated.</Text>

          {error && <ErrorText className="mb-4 text-sm">{error}</ErrorText>}

          {loading ? (
            <View className="gap-2">
              {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <View key={i} className="h-16 rounded-xl bg-base-850/70" />
              ))}
            </View>
          ) : shared.length === 0 ? (
            <EmptyState icon="🤝">
              <Text className="max-w-xs text-center text-sm text-base-500">
                No overlap yet — you haven&apos;t rated any of the same shows.
              </Text>
            </EmptyState>
          ) : (
            <>
              <View className="mb-8 flex-row gap-3">
                <View className="flex-1">
                  <StatCard label="Taste match" value={matchPercent !== null ? `${matchPercent}%` : '—'} />
                </View>
                <View className="flex-1">
                  <StatCard label="Shows in common" value={shared.length} />
                </View>
              </View>

              <Text className="mb-4 text-xs font-semibold uppercase tracking-wide text-base-400">
                Biggest differences first
              </Text>
              <View className="gap-2">
                {shared.map((r) => (
                  <Link key={r.showId} href={showHref(r.showId)} asChild>
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel={r.showName}
                      className="flex-row items-center gap-3 rounded-xl border border-hairline bg-base-850/60 p-2.5 active:opacity-80"
                    >
                      <PosterThumb posterPath={r.showPosterPath} />
                      <View className="min-w-0 flex-1">
                        <Text numberOfLines={1} className="text-sm font-medium text-base-100">
                          {r.showName}
                        </Text>
                      </View>
                      <View className="shrink-0 flex-row items-center gap-2">
                        <View className="rounded-md bg-hover-strong px-1.5 py-1">
                          <Text className="text-xs text-base-200">You {r.mine.toFixed(1)}</Text>
                        </View>
                        <View className="rounded-md bg-hover-strong px-1.5 py-1">
                          <Text className="text-xs text-base-200">@{username} {r.theirs.toFixed(1)}</Text>
                        </View>
                      </View>
                    </Pressable>
                  </Link>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

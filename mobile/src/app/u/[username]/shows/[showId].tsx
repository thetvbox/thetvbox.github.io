import { Link, Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ErrorText } from '@/components/error-text'
import { PosterThumb } from '@/components/poster-thumb'
import { useAuth } from '@/contexts/AuthContext'
import { useThemeColors } from '@/hooks/use-theme-colors'
import { BottomTabInset } from '@/constants/theme'
import { formatShortDate } from '@/lib/date'
import { errorMessage } from '@/lib/format'
import { showHref } from '@/lib/navigation'
import { fetchRewatchesForShow } from '@/lib/rewatches'
import { fetchShowRating } from '@/lib/showRatings'
import { fetchUserByUsername } from '@/lib/users'
import { fetchWatchedForUserAndShow } from '@/lib/watched'
import type { AppUser, EpisodeWatched, ShowRating, ShowRewatch } from '@/types'

const SHOW_DIARY_BOTTOM_PADDING = BottomTabInset + 40

/** One member's watch history for a single show: rating, rewatch dates, and every logged episode -- ported from web's ShowDiary.tsx. */
export default function ShowDiaryScreen() {
  const { username, showId } = useLocalSearchParams<{ username: string; showId: string }>()
  const { user: me } = useAuth()
  const theme = useThemeColors()
  const showIdNum = Number(showId)

  const [profile, setProfile] = useState<AppUser | null | undefined>(undefined)
  const [rating, setRating] = useState<ShowRating | null>(null)
  const [watched, setWatched] = useState<EpisodeWatched[]>([])
  const [rewatches, setRewatches] = useState<ShowRewatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!username || Number.isNaN(showIdNum)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchUserByUsername(username)
      .then(async (found) => {
        if (cancelled) return
        setProfile(found)
        if (found) {
          const [ratingRow, watchedRows, rewatchRows] = await Promise.all([
            fetchShowRating(found.id, showIdNum),
            fetchWatchedForUserAndShow(found.id, showIdNum),
            fetchRewatchesForShow(found.id, showIdNum),
          ])
          if (!cancelled) {
            setRating(ratingRow)
            setWatched(watchedRows)
            setRewatches(rewatchRows)
          }
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err, 'Failed to load this show.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [username, showIdNum])

  const isMe = me?.username === username
  const showName = rating?.show_name ?? watched[0]?.show_name
  const posterPath = rating?.show_poster_path ?? watched[0]?.show_poster_path
  const hasNothing = !loading && !rating && watched.length === 0 && rewatches.length === 0

  if (profile === null) {
    return (
      <View className="flex-1 items-center justify-center bg-base-950 px-6">
        <Stack.Screen options={{ title: 'Show Diary' }} />
        <ErrorText className="text-center text-sm">{`No one found with username "${username}".`}</ErrorText>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-base-950">
      <Stack.Screen options={{ title: showName ?? 'Show Diary' }} />
      <SafeAreaView edges={['bottom']} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: SHOW_DIARY_BOTTOM_PADDING }}>
          {loading ? (
            <View className="gap-4">
              <View className="flex-row gap-3">
                <View className="h-24 w-16 rounded-lg bg-base-800" />
                <View className="gap-2 pt-1">
                  <View className="h-5 w-40 rounded bg-base-800" />
                  <View className="h-3 w-24 rounded bg-base-800" />
                </View>
              </View>
            </View>
          ) : hasNothing ? (
            <Text className="mt-10 text-center text-sm text-base-500">{error ?? 'No activity for this show yet.'}</Text>
          ) : (
            <>
              <View className="mb-8 flex-row items-center gap-4">
                <PosterThumb posterPath={posterPath ?? null} size="lg" />
                <View className="min-w-0 flex-1">
                  <Text className="text-lg font-semibold text-base-100">{showName}</Text>
                  <View className="mt-1 flex-row flex-wrap items-center gap-x-2 gap-y-0.5">
                    {rating ? (
                      <View className="flex-row items-center gap-1">
                        <Text className="text-xs text-star">{rating.rating.toFixed(1)}</Text>
                        <SymbolView name="star.fill" size={12} tintColor={theme.star} />
                      </View>
                    ) : (
                      <Text className="text-xs text-base-400">{isMe ? "You haven't" : "Hasn't"} rated this yet</Text>
                    )}
                    {watched.length > 0 && (
                      <Text className="text-xs text-base-400">
                        · {watched.length} {watched.length === 1 ? 'episode' : 'episodes'} watched
                      </Text>
                    )}
                    {rewatches.length > 0 && (
                      <Text className="text-xs text-base-400">
                        · rewatched {rewatches.length} {rewatches.length === 1 ? 'time' : 'times'}
                      </Text>
                    )}
                  </View>
                  <Link href={showHref(showIdNum)} asChild>
                    <Pressable accessibilityRole="link" accessibilityLabel="Open show page" className="mt-1.5 self-start">
                      <Text className="text-xs font-medium text-accent-400">Open show page →</Text>
                    </Pressable>
                  </Link>
                </View>
              </View>

              {rewatches.length > 0 && (
                <View className="mb-6">
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-400">Rewatches</Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    {rewatches.map((r) => (
                      <View key={r.id} className="rounded-full bg-hover-strong px-2.5 py-1">
                        <Text className="text-xs text-base-300">{formatShortDate(r.rewatched_at)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {watched.length > 0 && (
                <>
                  <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-base-400">
                    Watched, most recent first
                  </Text>
                  <View className="gap-2">
                    {watched.map((w) => (
                      <View
                        key={w.id}
                        className="flex-row items-center justify-between rounded-xl border border-hairline bg-base-850/60 p-3"
                      >
                        <View className="min-w-0 flex-1">
                          <Text numberOfLines={1} className="text-sm font-medium text-base-100">
                            S{w.season_number} · E{w.episode_number}
                            {w.episode_name ? ` — ${w.episode_name}` : ''}
                          </Text>
                          <Text className="text-xs text-base-500">
                            {w.watched_at_unknown ? 'Watched a while ago' : formatShortDate(w.watched_at)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

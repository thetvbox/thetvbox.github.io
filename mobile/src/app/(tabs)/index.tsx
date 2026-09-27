import { Link } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EmptyState } from '@/components/empty-state'
import { ErrorText } from '@/components/error-text'
import { PosterGrid } from '@/components/poster-grid'
import { PosterTile } from '@/components/poster-tile'
import { ShowGridSkeleton } from '@/components/skeletons'
import { StreamingBadge } from '@/components/streaming-badge'
import { SeasonProgressBar } from '@/components/season-progress-bar'
import { UpcomingRow } from '@/components/upcoming-row'
import type { UpcomingItem } from '@/components/upcoming-row'
import { useAuth } from '@/contexts/AuthContext'
import { useStreamingPlatforms } from '@/hooks/useStreamingPlatforms'
import { BottomTabInset } from '@/constants/theme'
import { formatShortDate } from '@/lib/date'
import { errorMessage } from '@/lib/format'
import { fetchListsForUser } from '@/lib/lists'
import { listDetailHref, showHref } from '@/lib/navigation'
import { nowWatching, summarizeShowActivity } from '@/lib/showActivity'
import { fetchDismissedForUser } from '@/lib/showDismissed'
import { fetchDroppedForUser } from '@/lib/showDropped'
import {
  computeSeasonProgress,
  countWatchedBySeason,
  fetchNextEpisode,
  fetchSeasonBreakdowns,
} from '@/lib/seasonProgress'
import type { NextEpisode, SeasonProgress } from '@/lib/seasonProgress'
import { fetchRecentShowRatings } from '@/lib/showRatings'
import { fetchStartedForUser } from '@/lib/showStarted'
import { fetchRecentWatched } from '@/lib/watched'
import { fetchWatchlist } from '@/lib/watchlist'
import { ACTIVITY_FETCH_LIMIT, HOME_PREVIEW_LIMIT, PROFILE_LISTS_TAB_QUERY, SKELETON_ROWS } from '@/lib/constants'
import type {
  EpisodeWatched,
  ShowDropped,
  ShowListWithCount,
  ShowRating,
  ShowStarted,
  ShowWatchingDismissed,
  WatchlistItem,
} from '@/types'

const MAX_WATCHING_SKELETON_TILES = 10
const HOME_BOTTOM_PADDING = BottomTabInset + 40

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 5) return 'Still up'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function HomeScreen() {
  const { user } = useAuth()
  const [ratings, setRatings] = useState<ShowRating[]>([])
  const [watched, setWatched] = useState<EpisodeWatched[]>([])
  const [started, setStarted] = useState<ShowStarted[]>([])
  const [dismissed, setDismissed] = useState<ShowWatchingDismissed[]>([])
  const [dropped, setDropped] = useState<ShowDropped[]>([])
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [lists, setLists] = useState<ShowListWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(null)
    Promise.all([
      fetchRecentShowRatings(user.id, ACTIVITY_FETCH_LIMIT),
      fetchRecentWatched(user.id, ACTIVITY_FETCH_LIMIT),
      fetchStartedForUser(user.id),
      fetchDismissedForUser(user.id),
      fetchDroppedForUser(user.id),
      fetchWatchlist(user.id),
      fetchListsForUser(user.id),
    ])
      .then(([ratingRows, watchedRows, startedRows, dismissedRows, droppedRows, watchlistRows, listRows]) => {
        if (cancelled) return
        setRatings(ratingRows)
        setWatched(watchedRows)
        setStarted(startedRows)
        setDismissed(dismissedRows)
        setDropped(droppedRows)
        setWatchlist(watchlistRows)
        setLists(listRows)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err, 'Failed to load your shows.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const activity = useMemo(
    () => summarizeShowActivity(ratings, watched, started, dismissed, dropped),
    [ratings, watched, started, dismissed, dropped],
  )
  const watching = useMemo(() => nowWatching(activity), [activity])

  const watchedBySeasonByShow = useMemo(() => {
    const byShow = new Map<number, EpisodeWatched[]>()
    for (const w of watched) {
      const rows = byShow.get(w.show_id)
      if (rows) rows.push(w)
      else byShow.set(w.show_id, [w])
    }
    return new Map(Array.from(byShow, ([showId, rows]) => [showId, countWatchedBySeason(rows)]))
  }, [watched])

  const [seasonProgress, setSeasonProgress] = useState<Map<number, SeasonProgress>>(new Map())
  const [nextEpisodes, setNextEpisodes] = useState<Map<number, NextEpisode>>(new Map())
  const [enrichedKey, setEnrichedKey] = useState<string | null>(null)
  const watchingIds = useMemo(() => watching.map((s) => s.showId), [watching])
  const watchingKey = watchingIds.join(',')
  const { platforms } = useStreamingPlatforms(watchingIds)

  useEffect(() => {
    if (!watchingKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSeasonProgress(new Map())
      setNextEpisodes(new Map())
      setEnrichedKey('')
      return
    }
    let cancelled = false
    const showIds = watchingKey.split(',').map(Number)
    fetchSeasonBreakdowns(showIds)
      .then((breakdowns) => {
        if (cancelled) return
        const progressByShow = new Map<number, SeasonProgress>()
        for (const id of showIds) {
          const seasons = breakdowns.get(id)
          if (!seasons) continue
          const progress = computeSeasonProgress(seasons, watchedBySeasonByShow.get(id) ?? {})
          if (progress) progressByShow.set(id, progress)
        }
        setSeasonProgress(progressByShow)
        setEnrichedKey(watchingKey)

        Promise.all(
          Array.from(progressByShow.entries()).map(async ([showId, progress]) => {
            const next = await fetchNextEpisode(showId, progress.currentSeasonNumber)
            return [showId, next] as const
          }),
        )
          .then((results) => {
            if (cancelled) return
            const nextByShow = new Map<number, NextEpisode>()
            for (const [showId, next] of results) {
              if (next) nextByShow.set(showId, next)
            }
            setNextEpisodes(nextByShow)
          })
          .catch(() => {})
      })
      .catch(() => {
        if (!cancelled) setEnrichedKey(watchingKey)
      })
    return () => {
      cancelled = true
    }
  }, [watchingKey, watchedBySeasonByShow])

  const showWatchingSkeleton = loading || (watchingIds.length > 0 && enrichedKey !== watchingKey)

  const upcoming = useMemo<UpcomingItem[]>(() => {
    const items: UpcomingItem[] = []
    for (const s of watching) {
      const next = nextEpisodes.get(s.showId)
      if (!next) continue
      items.push({
        showId: s.showId,
        showName: s.showName,
        showPosterPath: s.showPosterPath,
        seasonNumber: next.seasonNumber,
        episodeNumber: next.episodeNumber,
        airDate: next.airDate,
      })
    }
    return items.sort((a, b) => a.airDate.localeCompare(b.airDate))
  }, [watching, nextEpisodes])

  const watchlistPreview = watchlist.slice(0, HOME_PREVIEW_LIMIT)
  const listsPreview = lists.slice(0, HOME_PREVIEW_LIMIT)

  return (
    <View className="flex-1 bg-base-950">
      <SafeAreaView edges={['top']} className="flex-1">
        <ScrollView contentContainerStyle={{ paddingBottom: HOME_BOTTOM_PADDING }}>
          <View className="gap-12 px-4 pt-4">
            <View className="gap-6">
              <View>
                <Text className="text-sm font-medium text-accent-400">
                  {greeting()}
                  {user ? `, @${user.username}` : ''}
                </Text>
                <Text accessibilityRole="header" className="mt-0.5 text-2xl font-semibold text-base-100">
                  Now Watching
                </Text>
                <Text className="mt-1 text-sm text-base-500">
                  Shows you&apos;ve started but haven&apos;t finished, most recently watched first.
                </Text>
              </View>

              {error && <ErrorText>{error}</ErrorText>}

              {showWatchingSkeleton ? (
                <ShowGridSkeleton count={Math.min(watching.length || SKELETON_ROWS, MAX_WATCHING_SKELETON_TILES)} progress />
              ) : watching.length === 0 ? (
                <EmptyState icon="📺">
                  <Text className="max-w-xs text-center text-sm text-base-500">
                    Nothing in progress. Mark an episode watched on any show and it&apos;ll show up here.
                  </Text>
                  <View className="mt-4 flex-row items-center gap-3">
                    <Link href="/search" asChild>
                      <Pressable
                        className="rounded-lg border border-hairline-strong px-4 py-2 active:opacity-70"
                        accessibilityRole="link"
                        accessibilityLabel="Find a show"
                      >
                        <Text className="text-sm text-base-200">Find a show</Text>
                      </Pressable>
                    </Link>
                    <Link href="/members" asChild>
                      <Pressable accessibilityRole="link" accessibilityLabel="Find people to follow">
                        <Text className="text-sm text-accent-400">Find people to follow</Text>
                      </Pressable>
                    </Link>
                  </View>
                </EmptyState>
              ) : (
                <PosterGrid
                  data={watching}
                  keyExtractor={(s) => String(s.showId)}
                  renderItem={(s) => {
                    const progress = seasonProgress.get(s.showId)
                    const isMultiSeason = Boolean(progress && progress.segments.length > 1)
                    const watchedNum = isMultiSeason ? progress!.currentSeasonWatched : s.watchedCount
                    const totalNum = isMultiSeason ? progress!.currentSeasonTotal : s.totalEpisodes
                    const nextEpisode = nextEpisodes.get(s.showId)
                    return (
                      <Link href={showHref(s.showId)} asChild>
                        <Pressable accessibilityRole="link" accessibilityLabel={s.showName} className="active:opacity-80">
                          <PosterTile posterPath={s.showPosterPath} name={s.showName}>
                            <StreamingBadge provider={platforms.get(s.showId)} />
                          </PosterTile>
                          <Text numberOfLines={1} className="mt-2 text-sm font-medium text-base-100">
                            {s.showName}
                          </Text>
                          <Text className="text-xs text-base-400">
                            {isMultiSeason && `Season ${progress!.currentSeasonNumber} · `}
                            {watchedNum}
                            {totalNum ? `/${totalNum}` : ''}
                            {s.lastWatchedAt
                              ? ` · ${s.lastWatchedAtUnknown ? 'a while ago' : formatShortDate(s.lastWatchedAt)}`
                              : ''}
                          </Text>
                          {nextEpisode && (
                            <Text className="text-[11px] text-accent-400">
                              New episode {formatShortDate(nextEpisode.airDate)}
                            </Text>
                          )}
                          <View className="mt-1.5">
                            <SeasonProgressBar
                              segments={
                                progress?.segments ??
                                (s.totalEpisodes ? [{ seasonNumber: 1, watched: s.watchedCount, total: s.totalEpisodes }] : [])
                              }
                            />
                          </View>
                        </Pressable>
                      </Link>
                    )
                  }}
                />
              )}
            </View>

            {upcoming.length > 0 && (
              <View className="gap-4">
                <Text accessibilityRole="header" className="text-lg font-semibold text-base-100">
                  Upcoming
                </Text>
                <View className="gap-2">
                  {upcoming.map((item) => (
                    <UpcomingRow key={item.showId} item={item} />
                  ))}
                </View>
              </View>
            )}

            {!loading && watchlist.length > 0 && (
              <View className="gap-4">
                <View className="flex-row items-center justify-between">
                  <Text accessibilityRole="header" className="text-lg font-semibold text-base-100">
                    Your Watchlist
                  </Text>
                  <Link href="/profile" asChild>
                    <Pressable accessibilityRole="link" accessibilityLabel="Manage your watchlist">
                      <Text className="text-xs font-medium text-accent-400">
                        {watchlist.length > HOME_PREVIEW_LIMIT ? 'See all' : 'Manage'} →
                      </Text>
                    </Pressable>
                  </Link>
                </View>
                <PosterGrid
                  data={watchlistPreview}
                  keyExtractor={(w) => w.id}
                  renderItem={(w) => (
                    <Link href={showHref(w.show_id)} asChild>
                      <Pressable accessibilityRole="link" accessibilityLabel={w.show_name} className="active:opacity-80">
                        <PosterTile posterPath={w.show_poster_path} name={w.show_name} />
                        <Text numberOfLines={1} className="mt-2 text-sm font-medium text-base-100">
                          {w.show_name}
                        </Text>
                        <Text className="text-xs text-base-400">Added {formatShortDate(w.added_at)}</Text>
                      </Pressable>
                    </Link>
                  )}
                />
              </View>
            )}

            {!loading && lists.length > 0 && (
              <View className="gap-4">
                <View className="flex-row items-center justify-between">
                  <Text accessibilityRole="header" className="text-lg font-semibold text-base-100">
                    Your Lists
                  </Text>
                  <Link href={`/profile?${PROFILE_LISTS_TAB_QUERY}`} asChild>
                    <Pressable accessibilityRole="link" accessibilityLabel="Manage your lists">
                      <Text className="text-xs font-medium text-accent-400">
                        {lists.length > HOME_PREVIEW_LIMIT ? 'See all' : 'Manage'} →
                      </Text>
                    </Pressable>
                  </Link>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {listsPreview.map((l) => (
                    <Link key={l.id} href={user ? listDetailHref(user.username, l.id) : '/profile'} asChild>
                      <Pressable
                        className="rounded-full border border-hairline-strong bg-base-850/60 px-3.5 py-2 active:opacity-70"
                        accessibilityRole="link"
                        accessibilityLabel={`${l.name}, ${l.itemCount} shows`}
                      >
                        <Text className="text-sm text-base-200">
                          {l.name} <Text className="text-base-500">· {l.itemCount}</Text>
                        </Text>
                      </Pressable>
                    </Link>
                  ))}
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

import { Link } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ActivityFiltersSheet } from '@/components/activity-filters-sheet'
import { ActivityRow } from '@/components/activity-row'
import { Avatar } from '@/components/avatar'
import { PILL_ACTIVE_CLASSES, PILL_ACTIVE_TEXT_CLASSES, PILL_INACTIVE_CLASSES, PILL_INACTIVE_TEXT_CLASSES, PILL_SIZE_CLASSES } from '@/components/chip'
import { EmptyState } from '@/components/empty-state'
import { ErrorText } from '@/components/error-text'
import { FollowActivityRow } from '@/components/follow-activity-row'
import { PosterGrid } from '@/components/poster-grid'
import { PosterTile } from '@/components/poster-tile'
import { SegmentedControl } from '@/components/segmented-control'
import { ShowGridSkeleton } from '@/components/skeletons'
import { useAuth } from '@/contexts/AuthContext'
import { BottomTabInset } from '@/constants/theme'
import {
  GROUP_ACTIVITY_FETCH_LIMIT,
  GROUP_ACTIVITY_WATCHED_FETCH_LIMIT,
  NOW_WATCHING_PREVIEW_LIMIT,
  SKELETON_ROWS_WIDE,
} from '@/lib/constants'
import { groupByDay } from '@/lib/date'
import { errorMessage } from '@/lib/format'
import { fetchAllFollows, fetchFollowingIds } from '@/lib/follows'
import { showHref } from '@/lib/navigation'
import { fetchRecentSeasonRatingsAllUsers } from '@/lib/seasonRatings'
import { buildFollowActivity, buildFriendsWatching, buildGroupActivity, mergeActivityFeed } from '@/lib/showActivity'
import type { ActivityFeedItem, FriendWatchingEntry } from '@/lib/showActivity'
import { fetchDismissedAllUsers } from '@/lib/showDismissed'
import { fetchDroppedAllUsers } from '@/lib/showDropped'
import { fetchRecentShowRatingsAllUsers } from '@/lib/showRatings'
import { fetchStartedAllUsers } from '@/lib/showStarted'
import { getShowDetailsBulk } from '@/lib/tmdb'
import { fetchAllUsers } from '@/lib/users'
import { fetchRecentWatchedAllUsers } from '@/lib/watched'
import type { AppUser, TmdbShowDetail } from '@/types'

interface DayGroup {
  heading: string
  items: ActivityFeedItem[]
}

type Scope = 'following' | 'everyone'

const SCOPE_OPTIONS = [
  { value: 'following', label: 'Following' },
  { value: 'everyone', label: 'Everyone' },
] as const

const ACTIVITY_BOTTOM_PADDING = BottomTabInset + 40

/** Returns who "did" this item, for scope-filtering and the person-chip row. */
function actorUsername(item: ActivityFeedItem): string {
  return item.kind === 'follow' ? item.followerUsername : item.username
}
function actorId(item: ActivityFeedItem, usernameToId: Map<string, string>): string | undefined {
  return item.kind === 'follow' ? item.followerId : usernameToId.get(item.username)
}

export default function ActivityScreen() {
  const { user: me } = useAuth()
  const [feed, setFeed] = useState<ActivityFeedItem[]>([])
  const [watching, setWatching] = useState<FriendWatchingEntry[]>([])
  const [showDetails, setShowDetails] = useState<Map<number, TmdbShowDetail>>(new Map())
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set())
  const [showAllWatching, setShowAllWatching] = useState(false)
  const [members, setMembers] = useState<AppUser[]>([])
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [scope, setScope] = useState<Scope>('following')
  const [filterUsername, setFilterUsername] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scopeTouched = useRef(false)

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(null)
    Promise.all([
      fetchRecentShowRatingsAllUsers(GROUP_ACTIVITY_FETCH_LIMIT),
      fetchRecentWatchedAllUsers(GROUP_ACTIVITY_WATCHED_FETCH_LIMIT),
      fetchRecentSeasonRatingsAllUsers(GROUP_ACTIVITY_FETCH_LIMIT),
      fetchStartedAllUsers(),
      fetchDismissedAllUsers(),
      fetchDroppedAllUsers(),
      fetchAllUsers(),
      fetchAllFollows(),
      me ? fetchFollowingIds(me.id) : Promise.resolve(new Set<string>()),
    ])
      .then(([ratingRows, watchedRows, seasonRatingRows, startedRows, dismissedRows, droppedRows, users, follows, following]) => {
        if (cancelled) return
        const showEvents = buildGroupActivity(ratingRows, watchedRows, seasonRatingRows)
        const usernameById = new Map(users.map((u) => [u.id, u.username]))
        const followEvents = buildFollowActivity(follows, usernameById)
        setFeed(mergeActivityFeed(showEvents, followEvents))
        setWatching(buildFriendsWatching(ratingRows, watchedRows, startedRows, dismissedRows, droppedRows))
        setMembers(users)
        setFollowingIds(following)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err, 'Failed to load activity.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [me])

  const watchingShowIdsKey = useMemo(() => Array.from(new Set(watching.map((w) => w.showId))).join(','), [watching])

  useEffect(() => {
    if (!watchingShowIdsKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowDetails(new Map())
      return
    }
    let cancelled = false
    getShowDetailsBulk(watchingShowIdsKey.split(',').map(Number))
      .then((map) => {
        if (!cancelled) setShowDetails(map)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [watchingShowIdsKey])

  useEffect(() => {
    if (!loading && !scopeTouched.current && followingIds.size === 0) {
      setScope('everyone')
    }
  }, [loading, followingIds])

  function handleSetScope(next: Scope) {
    scopeTouched.current = true
    setScope(next)
  }

  const usernameToId = useMemo(() => new Map(members.map((u) => [u.username, u.id])), [members])

  const scoped = useMemo(() => {
    if (scope === 'everyone' || !me) return feed
    return feed.filter((item) => {
      const id = actorId(item, usernameToId)
      return id === me.id || followingIds.has(id ?? '')
    })
  }, [feed, scope, me, followingIds, usernameToId])

  const scopedWatching = useMemo(() => {
    if (!me) return []
    return watching.filter((w) => w.userId !== me.id && (scope === 'everyone' || followingIds.has(w.userId)))
  }, [watching, scope, me, followingIds])

  const activeUsernames = useMemo(() => {
    const usernames = new Set(scoped.map(actorUsername))
    for (const w of scopedWatching) usernames.add(w.username)
    return usernames
  }, [scoped, scopedWatching])

  const filterableMembers = useMemo(
    () => members.filter((u) => activeUsernames.has(u.username)),
    [members, activeUsernames],
  )

  const personFilteredWatching = useMemo(
    () => (filterUsername ? scopedWatching.filter((w) => w.username === filterUsername) : scopedWatching),
    [scopedWatching, filterUsername],
  )

  const watchingGenres = useMemo(() => {
    const genres = new Set<string>()
    for (const w of scopedWatching) {
      for (const g of showDetails.get(w.showId)?.genres ?? []) genres.add(g.name)
    }
    return Array.from(genres).sort()
  }, [scopedWatching, showDetails])

  const genreCounts = useMemo(() => {
    const counts = new Map<string, number>(watchingGenres.map((g) => [g, 0]))
    for (const w of personFilteredWatching) {
      for (const g of showDetails.get(w.showId)?.genres ?? []) {
        if (counts.has(g.name)) counts.set(g.name, (counts.get(g.name) ?? 0) + 1)
      }
    }
    return counts
  }, [watchingGenres, personFilteredWatching, showDetails])

  const personCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const u of filterableMembers) {
      const feedCount = scoped.filter((item) => actorUsername(item) === u.username).length
      const watchingCount = scopedWatching.filter(
        (w) =>
          w.username === u.username &&
          (selectedGenres.size === 0 ||
            (showDetails.get(w.showId)?.genres ?? []).some((g) => selectedGenres.has(g.name))),
      ).length
      counts.set(u.username, feedCount + watchingCount)
    }
    return counts
  }, [filterableMembers, scoped, scopedWatching, selectedGenres, showDetails])

  const filteredWatching = useMemo(() => {
    if (selectedGenres.size === 0) return personFilteredWatching
    return personFilteredWatching.filter((w) => {
      const genres = showDetails.get(w.showId)?.genres
      return genres?.some((g) => selectedGenres.has(g.name))
    })
  }, [personFilteredWatching, selectedGenres, showDetails])

  function toggleGenre(genre: string) {
    setSelectedGenres((prev) => {
      const next = new Set(prev)
      if (next.has(genre)) next.delete(genre)
      else next.add(genre)
      return next
    })
  }

  const visibleWatching = showAllWatching ? filteredWatching : filteredWatching.slice(0, NOW_WATCHING_PREVIEW_LIMIT)
  const selectedGenresKey = useMemo(() => Array.from(selectedGenres).sort().join(','), [selectedGenres])

  useEffect(() => {
    if (filterUsername && !filterableMembers.some((u) => u.username === filterUsername)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilterUsername(null)
    }
  }, [filterUsername, filterableMembers])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedGenres((prev) => {
      const pruned = new Set(Array.from(prev).filter((g) => watchingGenres.includes(g)))
      return pruned.size === prev.size ? prev : pruned
    })
  }, [watchingGenres])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowAllWatching(false)
  }, [scope, filterUsername, selectedGenresKey])

  const filtersAvailable = filterableMembers.length > 1 || watchingGenres.length > 1
  const activeFilterCount = (filterUsername ? 1 : 0) + (selectedGenres.size > 0 ? 1 : 0)

  useEffect(() => {
    if (filtersOpen && !filtersAvailable) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFiltersOpen(false)
    }
  }, [filtersOpen, filtersAvailable])

  const filtered = useMemo(
    () => (filterUsername ? scoped.filter((item) => actorUsername(item) === filterUsername) : scoped),
    [scoped, filterUsername],
  )

  const dayGroups = useMemo<DayGroup[]>(
    () => groupByDay(filtered, (item) => item.at, (item) => item.atUnknown),
    [filtered],
  )

  const emptyMessage = filterUsername
    ? `@${filterUsername} hasn't done anything yet.`
    : scope === 'following'
      ? followingIds.size === 0
        ? "You're not following anyone yet."
        : 'Nobody you follow has done anything yet.'
      : "Nobody's rated or finished a show yet. Be the first."

  const watchingEmptyMessage = filterUsername
    ? `@${filterUsername} isn't watching anything right now.`
    : selectedGenres.size > 0
      ? 'No matches for the selected genres.'
      : scope === 'following'
        ? followingIds.size === 0
          ? "You're not following anyone yet."
          : 'Nobody you follow is watching anything right now.'
        : "Nobody's watching anything right now."

  const filtersButtonActive = filtersOpen || activeFilterCount > 0

  return (
    <View className="flex-1 bg-base-950">
      <SafeAreaView edges={['top']} className="flex-1">
        <ScrollView contentContainerStyle={{ paddingBottom: ACTIVITY_BOTTOM_PADDING }}>
          <View className="gap-8 px-4 pt-4">
            <View className="gap-4">
              <View>
                <Text accessibilityRole="header" className="text-2xl font-semibold text-base-100">
                  Activity
                </Text>
                <Text className="mt-1 text-sm text-base-500">
                  {filterUsername
                    ? `What @${filterUsername} has been up to.`
                    : scope === 'following'
                      ? 'What people you follow have been up to.'
                      : 'What the group has been up to.'}
                </Text>
              </View>

              <View className="flex-row flex-wrap items-center justify-between gap-2">
                <SegmentedControl
                  options={SCOPE_OPTIONS}
                  value={scope}
                  onChange={handleSetScope}
                  label="Activity scope"
                />

                {filtersAvailable && (
                  <Pressable
                    onPress={() => setFiltersOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Filters"
                    accessibilityState={{ selected: filtersButtonActive }}
                    className={`ml-auto shrink-0 ${PILL_SIZE_CLASSES} ${
                      filtersButtonActive ? PILL_ACTIVE_CLASSES : PILL_INACTIVE_CLASSES
                    }`}
                  >
                    <Text className={filtersButtonActive ? PILL_ACTIVE_TEXT_CLASSES : PILL_INACTIVE_TEXT_CLASSES}>
                      Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            {error && <ErrorText>{error}</ErrorText>}

            <View>
              <Text className="text-lg font-semibold text-base-100">Now Watching</Text>
              <Text className="mt-1 text-sm text-base-500">
                {filterUsername
                  ? `What @${filterUsername} is watching right now.`
                  : scope === 'following'
                    ? 'What people you follow are watching right now.'
                    : "What everyone's watching right now."}
              </Text>

              <View className="mt-4">
                {loading ? (
                  <ShowGridSkeleton count={NOW_WATCHING_PREVIEW_LIMIT} />
                ) : filteredWatching.length === 0 ? (
                  <Text className="text-sm text-base-500">{watchingEmptyMessage}</Text>
                ) : (
                  <>
                    <PosterGrid
                      data={visibleWatching}
                      keyExtractor={(entry) => `${entry.userId}-${entry.showId}`}
                      renderItem={(entry) => <FriendWatchingTile entry={entry} />}
                    />
                    {filteredWatching.length > NOW_WATCHING_PREVIEW_LIMIT && (
                      <Pressable
                        onPress={() => setShowAllWatching((v) => !v)}
                        accessibilityRole="button"
                        className="mt-4"
                      >
                        <Text className="text-xs font-medium text-accent-400">
                          {showAllWatching ? 'Show less' : `Show all ${filteredWatching.length}`}
                        </Text>
                      </Pressable>
                    )}
                  </>
                )}
              </View>
            </View>

            <View>
              <Text className="mb-4 text-lg font-semibold text-base-100">Recent Activity</Text>

              {loading ? (
                <View className="gap-2">
                  {Array.from({ length: SKELETON_ROWS_WIDE }).map((_, i) => (
                    <View key={i} className="h-16 rounded-xl bg-base-850/70" />
                  ))}
                </View>
              ) : dayGroups.length === 0 ? (
                <EmptyState icon="👋">
                  <Text className="max-w-xs text-center text-sm text-base-500">{emptyMessage}</Text>
                  {!filterUsername && scope === 'following' && (
                    <View className="mt-3 flex-row items-center gap-3">
                      <Pressable onPress={() => handleSetScope('everyone')} accessibilityRole="button">
                        <Text className="text-xs text-accent-400">See everyone&apos;s activity</Text>
                      </Pressable>
                      {followingIds.size === 0 && (
                        <Link href="/members" asChild>
                          <Pressable accessibilityRole="link" accessibilityLabel="Find people to follow">
                            <Text className="text-xs text-accent-400">Find people to follow</Text>
                          </Pressable>
                        </Link>
                      )}
                    </View>
                  )}
                </EmptyState>
              ) : (
                <View className="gap-6">
                  {dayGroups.map((group) => (
                    <View key={group.heading + group.items[0].key}>
                      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-500">
                        {group.heading}
                      </Text>
                      <View className="gap-2">
                        {group.items.map((item) =>
                          item.kind === 'follow' ? (
                            <FollowActivityRow key={item.key} event={item} />
                          ) : (
                            <ActivityRow key={item.key} event={item} />
                          ),
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      <ActivityFiltersSheet
        visible={filtersOpen}
        members={filterableMembers}
        me={me}
        activeUsername={filterUsername}
        onSelectUsername={setFilterUsername}
        personCounts={personCounts}
        genres={watchingGenres}
        selectedGenres={selectedGenres}
        onToggleGenre={toggleGenre}
        genreCounts={genreCounts}
        onClear={() => {
          setFilterUsername(null)
          setSelectedGenres(new Set())
        }}
        onClose={() => setFiltersOpen(false)}
      />
    </View>
  )
}

function FriendWatchingTile({ entry }: { entry: FriendWatchingEntry }) {
  return (
    <Link href={showHref(entry.showId)} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={entry.showName} className="active:opacity-80">
        <PosterTile posterPath={entry.showPosterPath} name={entry.showName} />
        <Text numberOfLines={1} className="mt-2 text-sm font-medium text-base-100">
          {entry.showName}
        </Text>
        <Text className="text-xs text-base-400">
          {entry.watchedCount}
          {entry.totalEpisodes ? `/${entry.totalEpisodes}` : ''} episodes
        </Text>
        <View className="mt-1.5 flex-row items-center gap-1.5">
          <Avatar username={entry.username} size="xs" />
          <Text numberOfLines={1} className="text-xs text-base-500">
            @{entry.username}
          </Text>
        </View>
      </Pressable>
    </Link>
  )
}

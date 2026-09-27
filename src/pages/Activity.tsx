import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { fetchRecentShowRatingsAllUsers } from '../lib/showRatings'
import { fetchRecentSeasonRatingsAllUsers } from '../lib/seasonRatings'
import { fetchRecentWatchedAllUsers } from '../lib/watched'
import { fetchStartedAllUsers } from '../lib/showStarted'
import { fetchDismissedAllUsers } from '../lib/showDismissed'
import { fetchDroppedAllUsers } from '../lib/showDropped'
import { buildFollowActivity, buildFriendsWatching, buildGroupActivity, mergeActivityFeed } from '../lib/showActivity'
import type { ActivityFeedItem, FriendWatchingEntry } from '../lib/showActivity'
import { fetchAllUsers } from '../lib/users'
import { fetchAllFollows, fetchFollowingIds } from '../lib/follows'
import { getShowDetailsBulk } from '../lib/tmdb'
import { groupByDay } from '../lib/date'
import { PAGE_HEADER_MOTION, staggerRowMotion, staggerTileMotion } from '../lib/motion'
import { offscreenSkipStyle } from '../lib/layout'
import {
  GROUP_ACTIVITY_FETCH_LIMIT,
  GROUP_ACTIVITY_WATCHED_FETCH_LIMIT,
  NOW_WATCHING_PREVIEW_LIMIT,
  SKELETON_ROWS_WIDE,
} from '../lib/constants'
import { ROUTES, showRoute } from '../lib/routes'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import ActivityRow from '../components/ActivityRow'
import ActivityFiltersPanel from '../components/ActivityFiltersPanel'
import FollowActivityRow from '../components/FollowActivityRow'
import EmptyState from '../components/EmptyState'
import Avatar from '../components/Avatar'
import SegmentedControl from '../components/SegmentedControl'
import { PILL_ACTIVE_CLASSES, PILL_INACTIVE_CLASSES, PILL_SIZE_CLASSES } from '../components/Chip'
import PosterTile, { POSTER_GRID_CLASSES } from '../components/PosterTile'
import { ShowGridSkeleton } from '../components/Skeletons'
import { useAuth } from '../contexts/AuthContext'
import { errorMessage } from '../lib/format'
import ErrorText from '../components/ErrorText'
import type { AppUser, TmdbShowDetail } from '../types'

interface DayGroup {
  heading: string
  items: ActivityFeedItem[]
}

type Scope = 'following' | 'everyone'

const SCOPE_OPTIONS = [
  { value: 'following', label: 'Following' },
  { value: 'everyone', label: 'Everyone' },
] as const

/** Returns who "did" this item, for scope-filtering and the person-chip row. */
function actorUsername(item: ActivityFeedItem): string {
  return item.kind === 'follow' ? item.followerUsername : item.username
}
function actorId(item: ActivityFeedItem, usernameToId: Map<string, string>): string | undefined {
  return item.kind === 'follow' ? item.followerId : usernameToId.get(item.username)
}

export default function Activity() {
  const { user: me } = useAuth()
  useDocumentTitle('Activity')
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
    // oxlint-disable-next-line react/set-state-in-effect
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
      .then((results) => {
        if (!cancelled) {
          const [
            ratingRows,
            watchedRows,
            seasonRatingRows,
            startedRows,
            dismissedRows,
            droppedRows,
            users,
            follows,
            following,
          ] = results
          const showEvents = buildGroupActivity(ratingRows, watchedRows, seasonRatingRows)
          const usernameById = new Map(users.map((u) => [u.id, u.username]))
          const followEvents = buildFollowActivity(follows, usernameById)
          setFeed(mergeActivityFeed(showEvents, followEvents))
          setWatching(buildFriendsWatching(ratingRows, watchedRows, startedRows, dismissedRows, droppedRows))
          setMembers(users)
          setFollowingIds(following)
        }
      })
      .catch((err) => {
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
      // oxlint-disable-next-line react/set-state-in-effect
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

  // Live per-option counts for the Filters sheet -- combined with the OTHER facet's current
  // selection, but never with this facet's own other selections, so picking one genre never
  // changes another genre's own displayed count (standard multi-select facet-count semantics).
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
      // oxlint-disable-next-line react/set-state-in-effect
      setFilterUsername(null)
    }
  }, [filterUsername, filterableMembers])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    setSelectedGenres((prev) => {
      const pruned = new Set(Array.from(prev).filter((g) => watchingGenres.includes(g)))
      return pruned.size === prev.size ? prev : pruned
    })
  }, [watchingGenres])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    setShowAllWatching(false)
  }, [scope, filterUsername, selectedGenresKey])

  const filtersAvailable = filterableMembers.length > 1 || watchingGenres.length > 1
  const activeFilterCount = (filterUsername ? 1 : 0) + (selectedGenres.size > 0 ? 1 : 0)

  useEffect(() => {
    if (filtersOpen && !filtersAvailable) {
      // oxlint-disable-next-line react/set-state-in-effect
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

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 md:pb-10">
      <motion.div {...PAGE_HEADER_MOTION} className="mb-6">
        <h1 className="large-title font-display text-xl font-semibold text-base-100 sm:text-2xl">Activity</h1>
        <p className="mt-1 text-sm text-base-500">
          {filterUsername
            ? `What @${filterUsername} has been up to.`
            : scope === 'following'
              ? 'What people you follow have been up to.'
              : 'What the group has been up to.'}
        </p>
      </motion.div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          options={SCOPE_OPTIONS}
          value={scope}
          onChange={handleSetScope}
          label="Activity scope"
        />

        {filtersAvailable && (
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            aria-pressed={filtersOpen}
            className={`ml-auto shrink-0 ${PILL_SIZE_CLASSES} ${
              filtersOpen || activeFilterCount > 0 ? PILL_ACTIVE_CLASSES : PILL_INACTIVE_CLASSES
            }`}
          >
            Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
          </button>
        )}
      </div>

      <AnimatePresence>
        {filtersOpen && (
          <ActivityFiltersPanel
            key="activity-filters"
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
        )}
      </AnimatePresence>

      {error && <ErrorText className="mb-4 text-sm">{error}</ErrorText>}

      <div className="mb-10">
        <h2 className="font-display text-lg font-semibold text-base-100">Now Watching</h2>
        <p className="mt-1 text-sm text-base-500">
          {filterUsername
            ? `What @${filterUsername} is watching right now.`
            : scope === 'following'
              ? 'What people you follow are watching right now.'
              : "What everyone's watching right now."}
        </p>

        <div className="mt-4">
          {loading ? (
            <ShowGridSkeleton count={NOW_WATCHING_PREVIEW_LIMIT} />
          ) : filteredWatching.length === 0 ? (
            <p className="text-sm text-base-500">{watchingEmptyMessage}</p>
          ) : (
            <>
              <div className={POSTER_GRID_CLASSES}>
                {visibleWatching.map((entry, i) => (
                  <FriendWatchingTile key={`${entry.userId}-${entry.showId}`} entry={entry} index={i} />
                ))}
              </div>
              {filteredWatching.length > NOW_WATCHING_PREVIEW_LIMIT && (
                <button
                  type="button"
                  onClick={() => setShowAllWatching((v) => !v)}
                  className="mt-4 text-xs font-medium text-accent-400 hover:underline"
                >
                  {showAllWatching ? 'Show less' : `Show all ${filteredWatching.length}`}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <h2 className="mb-4 font-display text-lg font-semibold text-base-100">Recent Activity</h2>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: SKELETON_ROWS_WIDE }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-base-850/70" />
          ))}
        </div>
      ) : dayGroups.length === 0 ? (
        <EmptyState icon="👋">
          <p className="max-w-xs text-sm text-base-500">{emptyMessage}</p>
          {!filterUsername && scope === 'following' && (
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleSetScope('everyone')}
                className="text-xs text-accent-400 hover:underline"
              >
                See everyone&apos;s activity
              </button>
              {followingIds.size === 0 && (
                <Link to={ROUTES.members} className="text-xs text-accent-400 hover:underline">
                  Find people to follow
                </Link>
              )}
            </div>
          )}
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {dayGroups.map((group) => (
            <div key={group.heading + group.items[0].key}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-500">{group.heading}</h3>
              <div className="space-y-2">
                {group.items.map((item, i) => (
                  <motion.div key={item.key} {...staggerRowMotion(i)} style={offscreenSkipStyle(72)}>
                    {item.kind === 'follow' ? <FollowActivityRow event={item} /> : <ActivityRow event={item} />}
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FriendWatchingTile({ entry, index }: { entry: FriendWatchingEntry; index: number }) {
  return (
    <motion.div {...staggerTileMotion(index)}>
      <Link to={showRoute(entry.showId)} className="group block">
        <PosterTile posterPath={entry.showPosterPath} name={entry.showName} />
        <p className="mt-2 truncate text-sm font-medium text-base-100">{entry.showName}</p>
        <p className="text-xs text-base-400">
          {entry.watchedCount}
          {entry.totalEpisodes ? `/${entry.totalEpisodes}` : ''} episodes
        </p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <Avatar username={entry.username} size="xs" />
          <span className="truncate text-xs text-base-500">@{entry.username}</span>
        </div>
      </Link>
    </motion.div>
  )
}

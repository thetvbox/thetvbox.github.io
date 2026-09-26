import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
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
import { useOutsideClick } from '../hooks/useOutsideClick'
import ActivityRow from '../components/ActivityRow'
import FollowActivityRow from '../components/FollowActivityRow'
import EmptyState from '../components/EmptyState'
import Avatar from '../components/Avatar'
import DropdownPanel from '../components/DropdownPanel'
import SegmentedControl from '../components/SegmentedControl'
import Chip, { PILL_ACTIVE_CLASSES, PILL_INACTIVE_CLASSES, PILL_SIZE_CLASSES } from '../components/Chip'
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
  const [genreFilterOpen, setGenreFilterOpen] = useState(false)
  const [showAllWatching, setShowAllWatching] = useState(false)
  const [members, setMembers] = useState<AppUser[]>([])
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [scope, setScope] = useState<Scope>('following')
  const [filterUsername, setFilterUsername] = useState<string | null>(null)
  const [personFilterOpen, setPersonFilterOpen] = useState(false)
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
    for (const w of personFilteredWatching) {
      for (const g of showDetails.get(w.showId)?.genres ?? []) genres.add(g.name)
    }
    return Array.from(genres).sort()
  }, [personFilteredWatching, showDetails])

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
    if (genreFilterOpen && watchingGenres.length <= 1) {
      // oxlint-disable-next-line react/set-state-in-effect
      setGenreFilterOpen(false)
    }
  }, [genreFilterOpen, watchingGenres])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    setShowAllWatching(false)
  }, [scope, filterUsername, selectedGenresKey])

  useEffect(() => {
    if (personFilterOpen && filterableMembers.length <= 1) {
      // oxlint-disable-next-line react/set-state-in-effect
      setPersonFilterOpen(false)
    }
  }, [personFilterOpen, filterableMembers])

  const personFilterRef = useOutsideClick<HTMLDivElement>(personFilterOpen, () => setPersonFilterOpen(false))
  const genreFilterRef = useOutsideClick<HTMLDivElement>(genreFilterOpen, () => setGenreFilterOpen(false))

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

        {filterableMembers.length > 1 && (
          <div ref={personFilterRef} className="relative ml-auto shrink-0">
            <button
              type="button"
              onClick={() => setPersonFilterOpen((v) => !v)}
              aria-expanded={personFilterOpen}
              aria-haspopup="true"
              className={`flex items-center gap-2 rounded-full py-2 pl-2 pr-4 text-sm font-medium transition-colors duration-200 ${
                personFilterOpen || filterUsername ? PILL_ACTIVE_CLASSES : PILL_INACTIVE_CLASSES
              }`}
            >
              {filterUsername ? (
                <>
                  <Avatar username={filterUsername} size="xs" />
                  <span>@{filterUsername}</span>
                </>
              ) : (
                'Filter by person'
              )}
            </button>

            <AnimatePresence>
              {personFilterOpen && (
                <PersonFilterPanel
                  key="person-filter"
                  members={filterableMembers}
                  me={me}
                  active={filterUsername}
                  onSelect={(username) => {
                    setFilterUsername(username)
                    setPersonFilterOpen(false)
                  }}
                  onClose={() => setPersonFilterOpen(false)}
                />
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {error && <ErrorText className="mb-4 text-sm">{error}</ErrorText>}

      <div className="mb-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-base-100">Now Watching</h2>
          {watchingGenres.length > 1 && (
            <div ref={genreFilterRef} className="relative ml-auto shrink-0">
              <button
                type="button"
                onClick={() => setGenreFilterOpen((v) => !v)}
                aria-expanded={genreFilterOpen}
                aria-haspopup="true"
                className={`${PILL_SIZE_CLASSES} ${
                  genreFilterOpen || selectedGenres.size > 0 ? PILL_ACTIVE_CLASSES : PILL_INACTIVE_CLASSES
                }`}
              >
                Filter by genre{selectedGenres.size > 0 ? ` · ${selectedGenres.size}` : ''}
              </button>

              <AnimatePresence>
                {genreFilterOpen && (
                  <GenreFilterPanel
                    key="genre-filter"
                    genres={watchingGenres}
                    selected={selectedGenres}
                    onToggle={toggleGenre}
                    onClear={() => setSelectedGenres(new Set())}
                    onClose={() => setGenreFilterOpen(false)}
                  />
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
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

/** The genre facet for Now Watching, floated behind the "Filter by genre" trigger button. */
function GenreFilterPanel({
  genres,
  selected,
  onToggle,
  onClear,
  onClose,
}: {
  genres: string[]
  selected: Set<string>
  onToggle: (genre: string) => void
  onClear: () => void
  onClose: () => void
}) {
  return (
    <DropdownPanel onClose={onClose} label="Filter by genre" className="w-64 p-3">
      {selected.size > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="mb-2 block text-xs font-medium text-accent-400 hover:underline"
        >
          Clear
        </button>
      )}
      <div className="scroll-fade-bottom max-h-64 overflow-y-auto pb-1">
        <div className="flex flex-wrap gap-1.5">
          {genres.map((genre) => (
            <Chip key={genre} active={selected.has(genre)} onClick={() => onToggle(genre)}>
              {genre}
            </Chip>
          ))}
        </div>
      </div>
    </DropdownPanel>
  )
}

/** The "who" drill-down for the feed, floated behind the "Filter by person" trigger button. */
function PersonFilterPanel({
  members,
  me,
  active,
  onSelect,
  onClose,
}: {
  members: AppUser[]
  me: AppUser | null
  active: string | null
  onSelect: (username: string | null) => void
  onClose: () => void
}) {
  return (
    <DropdownPanel onClose={onClose} label="Filter by person" className="w-60 p-2">
      <ul className="scroll-fade-bottom max-h-64 space-y-1 overflow-y-auto pb-1">
        {members.map((u) => (
          <li key={u.id}>
            <PersonRow
              active={active === u.username}
              onClick={() => onSelect(active === u.username ? null : u.username)}
            >
              <Avatar username={u.username} size="xs" />
              <span>{me?.username === u.username ? 'You' : `@${u.username}`}</span>
            </PersonRow>
          </li>
        ))}
      </ul>
    </DropdownPanel>
  )
}

function PersonRow({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left text-sm font-medium transition-colors duration-200 ${
        active ? 'bg-accent-500/15 text-accent-300' : 'text-base-200 hover:bg-hover'
      }`}
    >
      {children}
    </button>
  )
}

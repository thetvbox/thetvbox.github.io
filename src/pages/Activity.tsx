import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { fetchRecentShowRatingsAllUsers } from '../lib/showRatings'
import { fetchRecentSeasonRatingsAllUsers } from '../lib/seasonRatings'
import { fetchRecentWatchedAllUsers } from '../lib/watched'
import { buildFollowActivity, buildGroupActivity, mergeActivityFeed } from '../lib/showActivity'
import type { ActivityFeedItem } from '../lib/showActivity'
import { fetchAllUsers } from '../lib/users'
import { fetchAllFollows, fetchFollowingIds } from '../lib/follows'
import { dayKey, formatDiaryHeading } from '../lib/date'
import { PAGE_HEADER_MOTION, staggerRowMotion } from '../lib/motion'
import { GROUP_ACTIVITY_FETCH_LIMIT, GROUP_ACTIVITY_WATCHED_FETCH_LIMIT, SKELETON_ROWS_WIDE } from '../lib/constants'
import { ROUTES } from '../lib/routes'
import ActivityRow from '../components/ActivityRow'
import FollowActivityRow from '../components/FollowActivityRow'
import EmptyState from '../components/EmptyState'
import Avatar from '../components/Avatar'
import DropdownPanel from '../components/DropdownPanel'
import { useAuth } from '../contexts/AuthContext'
import { errorMessage } from '../lib/format'
import ErrorText from '../components/ErrorText'
import type { AppUser } from '../types'

interface DayGroup {
  heading: string
  items: ActivityFeedItem[]
}

type Scope = 'following' | 'everyone'

/** Returns who "did" this item, for scope-filtering and the person-chip row. */
function actorUsername(item: ActivityFeedItem): string {
  return item.kind === 'follow' ? item.followerUsername : item.username
}
function actorId(item: ActivityFeedItem, usernameToId: Map<string, string>): string | undefined {
  return item.kind === 'follow' ? item.followerId : usernameToId.get(item.username)
}

export default function Activity() {
  const { user: me } = useAuth()
  const [feed, setFeed] = useState<ActivityFeedItem[]>([])
  const [members, setMembers] = useState<AppUser[]>([])
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [scope, setScope] = useState<Scope>('following')
  const [filterUsername, setFilterUsername] = useState<string | null>(null)
  const [personFilterOpen, setPersonFilterOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scopeTouched = useRef(false)
  const personFilterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true)
    setError(null)
    Promise.all([
      fetchRecentShowRatingsAllUsers(GROUP_ACTIVITY_FETCH_LIMIT),
      fetchRecentWatchedAllUsers(GROUP_ACTIVITY_WATCHED_FETCH_LIMIT),
      fetchRecentSeasonRatingsAllUsers(GROUP_ACTIVITY_FETCH_LIMIT),
      fetchAllUsers(),
      fetchAllFollows(),
      me ? fetchFollowingIds(me.id) : Promise.resolve(new Set<string>()),
    ])
      .then(([ratingRows, watchedRows, seasonRatingRows, users, follows, following]) => {
        if (!cancelled) {
          const showEvents = buildGroupActivity(ratingRows, watchedRows, seasonRatingRows)
          const usernameById = new Map(users.map((u) => [u.id, u.username]))
          const followEvents = buildFollowActivity(follows, usernameById)
          setFeed(mergeActivityFeed(showEvents, followEvents))
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

  const activeUsernames = useMemo(() => new Set(scoped.map(actorUsername)), [scoped])
  const filterableMembers = useMemo(
    () => members.filter((u) => activeUsernames.has(u.username)),
    [members, activeUsernames],
  )

  useEffect(() => {
    if (filterUsername && !filterableMembers.some((u) => u.username === filterUsername)) {
      // oxlint-disable-next-line react/set-state-in-effect
      setFilterUsername(null)
    }
  }, [filterUsername, filterableMembers])

  useEffect(() => {
    if (personFilterOpen && filterableMembers.length <= 1) {
      // oxlint-disable-next-line react/set-state-in-effect
      setPersonFilterOpen(false)
    }
  }, [personFilterOpen, filterableMembers])

  useEffect(() => {
    if (!personFilterOpen) return
    function handlePointerDown(e: PointerEvent) {
      if (personFilterRef.current && !personFilterRef.current.contains(e.target as Node)) {
        setPersonFilterOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [personFilterOpen])

  const filtered = useMemo(
    () => (filterUsername ? scoped.filter((item) => actorUsername(item) === filterUsername) : scoped),
    [scoped, filterUsername],
  )

  const dayGroups = useMemo<DayGroup[]>(() => {
    const groups: DayGroup[] = []
    let currentKey = ''
    for (const item of filtered) {
      const key = item.atUnknown ? 'unknown' : dayKey(item.at)
      if (key !== currentKey) {
        groups.push({
          heading: item.atUnknown ? 'Watched a while ago' : formatDiaryHeading(item.at),
          items: [item],
        })
        currentKey = key
      } else {
        groups[groups.length - 1].items.push(item)
      }
    }
    return groups
  }, [filtered])

  const emptyMessage = filterUsername
    ? `@${filterUsername} hasn't done anything yet.`
    : scope === 'following'
      ? followingIds.size === 0
        ? "You're not following anyone yet."
        : 'Nobody you follow has done anything yet.'
      : "Nobody's rated or finished a show yet. Be the first."

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 md:pb-10">
      <motion.div {...PAGE_HEADER_MOTION} className="mb-6">
        <h1 className="font-display text-xl font-semibold text-base-100 sm:text-2xl">Activity</h1>
        <p className="mt-1 text-sm text-base-500">
          {filterUsername
            ? `What @${filterUsername} has been up to.`
            : scope === 'following'
              ? "What people you follow have been up to."
              : 'What the group has been up to.'}
        </p>
      </motion.div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <ScopeChip active={scope === 'following'} onClick={() => handleSetScope('following')}>
            Following
          </ScopeChip>
          <ScopeChip active={scope === 'everyone'} onClick={() => handleSetScope('everyone')}>
            Everyone
          </ScopeChip>
        </div>

        {filterableMembers.length > 1 && (
          <div ref={personFilterRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setPersonFilterOpen((v) => !v)}
              aria-expanded={personFilterOpen}
              aria-haspopup="true"
              className={`flex shrink-0 items-center gap-1.5 rounded-full py-1 pl-1.5 pr-3 text-xs font-medium transition-colors duration-200 ${
                personFilterOpen || filterUsername
                  ? 'bg-accent-500/15 text-accent-300 ring-1 ring-accent-500/40'
                  : 'bg-base-850/60 text-base-400 ring-1 ring-hairline hover:text-base-200'
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
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-500">
                {group.heading}
              </h3>
              <div className="space-y-2">
                {group.items.map((item, i) => (
                  <motion.div key={item.key} {...staggerRowMotion(i)}>
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

function ScopeChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200 ${
        active
          ? 'bg-accent-500/15 text-accent-300 ring-1 ring-accent-500/40'
          : 'bg-base-850/60 text-base-400 ring-1 ring-hairline hover:text-base-200'
      }`}
    >
      {children}
    </button>
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
    <DropdownPanel onClose={onClose} label="Filter by person" align="center" className="w-60 p-2">
      <ul className="max-h-64 space-y-1 overflow-y-auto">
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

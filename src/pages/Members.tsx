import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { fetchAllUsers } from '../lib/users'
import { fetchFollowerIds, fetchFollowingIds } from '../lib/follows'
import { PAGE_HEADER_MOTION, staggerRowMotion } from '../lib/motion'
import { SKELETON_ROWS } from '../lib/constants'
import { useFollowActions } from '../hooks/useFollowActions'
import FollowButton from '../components/FollowButton'
import Avatar from '../components/Avatar'
import EmptyState from '../components/EmptyState'
import Toast from '../components/Toast'
import type { AppUser } from '../types'

/** People directory: every row gets a Follow/Following button and a "Follows
 * you" badge, layered on top of the original searchable list. */
export default function Members() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<AppUser[]>([])
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [followerIds, setFollowerIds] = useState<Set<string>>(new Set())
  // Set, not a single id -- following/unfollowing two different rows at once
  // shouldn't have the one that resolves first clear the other's spinner.
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  // Kept in the URL (not just component state) so the search survives
  // navigating to a profile and back -- Members otherwise fully remounts on
  // return, losing whatever was typed.
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { follow, unfollow, toast, dismiss } = useFollowActions()

  function setQuery(next: string) {
    setSearchParams(
      (prev) => {
        const nextParams = new URLSearchParams(prev)
        if (next) nextParams.set('q', next)
        else nextParams.delete('q')
        return nextParams
      },
      { replace: true },
    )
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      fetchAllUsers(),
      me ? fetchFollowingIds(me.id) : Promise.resolve(new Set<string>()),
      me ? fetchFollowerIds(me.id) : Promise.resolve(new Set<string>()),
    ])
      .then(([allUsers, following, followers]) => {
        if (!cancelled) {
          setUsers(allUsers)
          setFollowingIds(following)
          setFollowerIds(followers)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load members.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [me])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => u.username.toLowerCase().includes(q))
  }, [users, query])

  function applyFollowing(targetId: string, following: boolean) {
    setFollowingIds((prev) => {
      const next = new Set(prev)
      if (following) next.add(targetId)
      else next.delete(targetId)
      return next
    })
  }

  async function handleFollow(targetId: string) {
    setSavingIds((prev) => new Set(prev).add(targetId))
    await follow(targetId, (following) => applyFollowing(targetId, following))
    setSavingIds((prev) => {
      const next = new Set(prev)
      next.delete(targetId)
      return next
    })
  }

  async function handleUnfollow(targetId: string) {
    const target = users.find((u) => u.id === targetId)
    setSavingIds((prev) => new Set(prev).add(targetId))
    await unfollow(targetId, target?.username, (following) => applyFollowing(targetId, following))
    setSavingIds((prev) => {
      const next = new Set(prev)
      next.delete(targetId)
      return next
    })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 md:pb-10">
      <motion.h1 {...PAGE_HEADER_MOTION} className="font-display mb-5 text-2xl font-semibold text-base-100">
        People
      </motion.h1>

      <div className="relative mb-6">
        <svg
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base-500"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a username…"
          className="w-full rounded-xl border border-hairline-strong bg-base-850 py-3 pl-10 pr-4 text-base text-base-100 placeholder:text-base-500 transition-[border-color,box-shadow] duration-200 focus:border-accent-500/60 focus:ring-4 focus:ring-accent-500/10 sm:text-sm"
        />
      </div>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-base-850/70" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="🔍">
          <p className="max-w-xs text-sm text-base-500">
            {users.length === 0 ? 'No one has registered yet.' : `No one matches “${query}”.`}
          </p>
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {filtered.map((u, i) => (
            <motion.li
              key={u.id}
              {...staggerRowMotion(i)}
              className="flex items-center gap-3 rounded-xl border border-hairline bg-base-850/60 p-3 transition-colors duration-200 hover:bg-base-800/70"
            >
              <Link to={`/u/${u.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar username={u.username} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-base-100">
                    @{u.username}
                    {me?.id === u.id && (
                      <span className="ml-2 rounded-full bg-hover-strong px-2 py-0.5 text-[10px] font-normal text-base-400">
                        You
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-base-500">
                    {me?.id !== u.id && followerIds.has(u.id) ? 'Follows you · ' : ''}
                    Joined{' '}
                    {new Date(u.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </Link>
              {me && me.id !== u.id && (
                <FollowButton
                  isFollowing={followingIds.has(u.id)}
                  saving={savingIds.has(u.id)}
                  onFollow={() => handleFollow(u.id)}
                  onUnfollow={() => handleUnfollow(u.id)}
                />
              )}
            </motion.li>
          ))}
        </ul>
      )}

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  )
}

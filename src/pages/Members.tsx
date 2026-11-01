import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { fetchAllUsers } from '../lib/users'
import { fetchFollowerIds, fetchFollowingIds } from '../lib/follows'
import { PAGE_HEADER_MOTION, staggerRowMotion } from '../lib/motion'
import { profileRoute } from '../lib/routes'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useQueryParam } from '../hooks/useQueryParam'
import { useFollowToggles } from '../hooks/useFollowToggles'
import FollowButton from '../components/FollowButton'
import Avatar from '../components/Avatar'
import EmptyState from '../components/EmptyState'
import Toast from '../components/Toast'
import { errorMessage } from '../lib/format'
import ErrorText from '../components/ErrorText'
import { RowListSkeleton } from '../components/Skeletons'
import SearchField from '../components/SearchField'
import type { AppUser } from '../types'

/** People directory: search plus a Follow/Following button and "Follows you" badge per row. */
export default function Members() {
  const { user: me } = useAuth()
  useDocumentTitle('People')
  const [users, setUsers] = useState<AppUser[]>([])
  const [followerIds, setFollowerIds] = useState<Set<string>>(new Set())
  const [query, setQuery] = useQueryParam('q')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { followingIds, setFollowingIds, savingIds, handleFollow, handleUnfollow, toast, dismiss } = useFollowToggles(
    (id) => users.find((u) => u.id === id)?.username,
  )

  useEffect(() => {
    let cancelled = false
    // oxlint-disable-next-line react/set-state-in-effect
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
        if (!cancelled) setError(errorMessage(err, 'Failed to load members.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [me, setFollowingIds])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => u.username.toLowerCase().includes(q))
  }, [users, query])

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 md:pb-10">
      <motion.h1 {...PAGE_HEADER_MOTION} className="font-display mb-5 text-2xl font-semibold text-base-100">
        People
      </motion.h1>

      <SearchField value={query} onChange={setQuery} placeholder="Find a username…" className="mb-6" />

      {error && <ErrorText className="mb-4 text-sm">{error}</ErrorText>}

      {loading ? (
        <RowListSkeleton />
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
              <Link to={profileRoute(u.username)} className="flex min-w-0 flex-1 items-center gap-3">
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

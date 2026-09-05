import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useEscapeAndFocusReturn } from '../hooks/useEscapeAndFocusReturn'
import { useFollowActions } from '../hooks/useFollowActions'
import { fetchFollowerIds, fetchFollowersWithUsers, fetchFollowingIds, fetchFollowingWithUsers } from '../lib/follows'
import { SKELETON_ROWS_COMPACT } from '../lib/constants'
import FollowButton from './FollowButton'
import Avatar from './Avatar'
import Toast from './Toast'
import InlinePanel from './InlinePanel'
import type { AppUser } from '../types'

interface FollowListPanelProps {
  /** Whose followers/following list this is -- not necessarily the viewer. */
  userId: string
  mode: 'followers' | 'following'
  onClose: () => void
  /** Called with +1/-1 when a follow/unfollow inside this panel succeeds, so
   * the caller can keep its own "N following" count in sync. Only meaningful
   * when the panel shows the viewer's own profile; safe to omit otherwise. */
  onMyFollowingCountChange?: (delta: number) => void
}

/** Inline followers/following list, opened from the count buttons on
 * Profile/PublicProfile. Every row gets its own Follow/Unfollow button for
 * the *viewer's* relationship to that person, plus a "Follows you" badge. */
export default function FollowListPanel({ userId, mode, onClose, onMyFollowingCountChange }: FollowListPanelProps) {
  const { user: me } = useAuth()
  const [people, setPeople] = useState<AppUser[]>([])
  const [myFollowingIds, setMyFollowingIds] = useState<Set<string>>(new Set())
  const [myFollowerIds, setMyFollowerIds] = useState<Set<string>>(new Set())
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { follow, unfollow, toast, dismiss } = useFollowActions()

  useEscapeAndFocusReturn(true, onClose)

  useEffect(() => {
    if (!me) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      mode === 'followers' ? fetchFollowersWithUsers(userId) : fetchFollowingWithUsers(userId),
      fetchFollowingIds(me.id),
      fetchFollowerIds(me.id),
    ])
      .then(([list, followingIds, followerIds]) => {
        if (!cancelled) {
          setPeople(list)
          setMyFollowingIds(followingIds)
          setMyFollowerIds(followerIds)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load this list.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, mode, me])

  function applyFollowing(targetId: string, following: boolean) {
    setMyFollowingIds((prev) => {
      const next = new Set(prev)
      if (following) next.add(targetId)
      else next.delete(targetId)
      return next
    })
    onMyFollowingCountChange?.(following ? 1 : -1)
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
    const target = people.find((p) => p.id === targetId)
    setSavingIds((prev) => new Set(prev).add(targetId))
    await unfollow(targetId, target?.username, (following) => applyFollowing(targetId, following))
    setSavingIds((prev) => {
      const next = new Set(prev)
      next.delete(targetId)
      return next
    })
  }

  return (
    <InlinePanel className="max-h-[70vh] overflow-y-auto p-3.5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-base-500">
          {mode === 'followers' ? 'Followers' : 'Following'}
        </p>
        <button type="button" onClick={onClose} className="text-xs text-base-500 hover:text-base-300">
          Close
        </button>
      </div>

      {error && <p className="mb-3 text-xs text-danger">{error}</p>}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: SKELETON_ROWS_COMPACT }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-base-850/70" />
          ))}
        </div>
      ) : people.length === 0 ? (
        <p className="py-4 text-center text-xs text-base-500">
          {mode === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-2.5 rounded-lg p-1.5 transition-colors duration-200 hover:bg-hover">
              <Link to={`/u/${p.username}`} onClick={onClose} className="flex min-w-0 flex-1 items-center gap-2.5">
                <Avatar username={p.username} size="xs" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-base-100">@{p.username}</p>
                  {myFollowerIds.has(p.id) && <p className="text-[10px] text-base-500">Follows you</p>}
                </div>
              </Link>
              {me && me.id !== p.id && (
                <FollowButton
                  size="sm"
                  isFollowing={myFollowingIds.has(p.id)}
                  saving={savingIds.has(p.id)}
                  onFollow={() => handleFollow(p.id)}
                  onUnfollow={() => handleUnfollow(p.id)}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      <Toast toast={toast} onDismiss={dismiss} />
    </InlinePanel>
  )
}

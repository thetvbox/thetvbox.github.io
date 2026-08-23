import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { fetchFollowCounts, followUser, isFollowingUser, unfollowUser } from '../lib/follows'
import { useToast } from '../hooks/useToast'
import FollowButton from './FollowButton'
import FollowListPanel from './FollowListPanel'
import Toast from './Toast'

interface ProfileFollowSectionProps {
  profileId: string
  /** For the unfollow toast's message -- optional since it's never used on
   * your own profile (no follow button renders there). */
  username?: string
  isMe: boolean
}

/** Follower/following counts (clickable, opening FollowListPanel) plus a
 * Follow/Unfollow button, shared between Profile.tsx and PublicProfile.tsx. */
export default function ProfileFollowSection({ profileId, username, isMe }: ProfileFollowSectionProps) {
  const { user: me } = useAuth()
  const [counts, setCounts] = useState({ followers: 0, following: 0 })
  const [isFollowing, setIsFollowing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [panel, setPanel] = useState<'followers' | 'following' | null>(null)
  const { toast, showUndo, showError, dismiss } = useToast()

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchFollowCounts(profileId),
      !isMe && me ? isFollowingUser(me.id, profileId) : Promise.resolve(false),
    ])
      .then(([c, following]) => {
        if (!cancelled) {
          setCounts(c)
          setIsFollowing(following)
        }
      })
      .catch(() => {
        // Silent -- a failed fetch just leaves counts at 0.
      })
    return () => {
      cancelled = true
    }
  }, [profileId, isMe, me])

  async function handleFollow() {
    if (!me) return
    setSaving(true)
    setIsFollowing(true)
    setCounts((c) => ({ ...c, followers: c.followers + 1 }))
    try {
      await followUser(me.id, profileId)
    } catch {
      setIsFollowing(false)
      setCounts((c) => ({ ...c, followers: Math.max(0, c.followers - 1) }))
      showError('Failed to follow. Try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUnfollow() {
    if (!me) return
    setSaving(true)
    setIsFollowing(false)
    setCounts((c) => ({ ...c, followers: Math.max(0, c.followers - 1) }))
    try {
      await unfollowUser(me.id, profileId)
    } catch {
      setIsFollowing(true)
      setCounts((c) => ({ ...c, followers: c.followers + 1 }))
      showError('Failed to unfollow. Try again.')
      return
    } finally {
      setSaving(false)
    }
    showUndo(username ? `Unfollowed @${username}` : 'Unfollowed', async () => {
      setIsFollowing(true)
      setCounts((c) => ({ ...c, followers: c.followers + 1 }))
      try {
        await followUser(me.id, profileId)
      } catch {
        setIsFollowing(false)
        setCounts((c) => ({ ...c, followers: Math.max(0, c.followers - 1) }))
        showError('Failed to undo. Try following again.')
      }
    })
  }

  // Only meaningful on your own profile: the only count that can change from
  // actions inside the panel is your own following count.
  function handlePanelFollowingCountChange(delta: number) {
    setCounts((c) => ({ ...c, following: Math.max(0, c.following + delta) }))
  }

  return (
    <div>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setPanel('followers')}
          className="text-xs text-base-400 transition-colors duration-200 hover:text-base-200"
        >
          <span className="font-semibold text-base-200">{counts.followers}</span>{' '}
          {counts.followers === 1 ? 'follower' : 'followers'}
        </button>
        <button
          type="button"
          onClick={() => setPanel('following')}
          className="text-xs text-base-400 transition-colors duration-200 hover:text-base-200"
        >
          <span className="font-semibold text-base-200">{counts.following}</span> following
        </button>
        {!isMe && me && (
          // Default (md) size -- a primary action on a spacious profile
          // header, not a dense list row like Members.tsx/FollowListPanel.
          <FollowButton isFollowing={isFollowing} saving={saving} onFollow={handleFollow} onUnfollow={handleUnfollow} />
        )}
      </div>
      {panel && (
        <FollowListPanel
          userId={profileId}
          mode={panel}
          onClose={() => setPanel(null)}
          onMyFollowingCountChange={isMe ? handlePanelFollowingCountChange : undefined}
        />
      )}
      {toast && <Toast message={toast.message} tone={toast.tone} action={toast.action} onDismiss={dismiss} />}
    </div>
  )
}

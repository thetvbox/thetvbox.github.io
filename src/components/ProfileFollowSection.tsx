import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { fetchFollowCounts, isFollowingUser } from '../lib/follows'
import { useFollowActions } from '../hooks/useFollowActions'
import FollowButton from './FollowButton'
import FollowListPanel from './FollowListPanel'
import Toast from './Toast'

interface ProfileFollowSectionProps {
  profileId: string
  username?: string
  isMe: boolean
}

/** Follower/following counts plus a Follow/Unfollow button, shared between Profile pages. */
export default function ProfileFollowSection({ profileId, username, isMe }: ProfileFollowSectionProps) {
  const { user: me } = useAuth()
  const [counts, setCounts] = useState({ followers: 0, following: 0 })
  const [isFollowing, setIsFollowing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [panel, setPanel] = useState<'followers' | 'following' | null>(null)
  const { follow, unfollow, toast, dismiss } = useFollowActions()

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
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [profileId, isMe, me])

  function applyFollowing(following: boolean) {
    setIsFollowing(following)
    setCounts((c) => ({ ...c, followers: Math.max(0, c.followers + (following ? 1 : -1)) }))
  }

  async function handleFollow() {
    setSaving(true)
    await follow(profileId, applyFollowing)
    setSaving(false)
  }

  async function handleUnfollow() {
    setSaving(true)
    await unfollow(profileId, username, applyFollowing)
    setSaving(false)
  }

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
          <FollowButton isFollowing={isFollowing} saving={saving} onFollow={handleFollow} onUnfollow={handleUnfollow} />
        )}
      </div>
      <AnimatePresence>
        {panel && (
          <FollowListPanel
            key="follow-list"
            userId={profileId}
            mode={panel}
            onClose={() => setPanel(null)}
            onMyFollowingCountChange={isMe ? handlePanelFollowingCountChange : undefined}
          />
        )}
      </AnimatePresence>
      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  )
}

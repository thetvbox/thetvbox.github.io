import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { FollowButton } from '@/components/follow-button'
import { FollowListSheet } from '@/components/follow-list-sheet'
import { Toast } from '@/components/toast'
import { useAuth } from '@/contexts/AuthContext'
import { useFollowActions } from '@/hooks/useFollowActions'
import { fetchFollowCounts, isFollowingUser } from '@/lib/follows'

interface ProfileFollowSectionProps {
  profileId: string
  username?: string
  isMe: boolean
}

type Panel = 'followers' | 'following' | null

/** Follower/following counts plus a Follow/Unfollow button, shared between profile screens. */
export function ProfileFollowSection({ profileId, username, isMe }: ProfileFollowSectionProps) {
  const { user: me } = useAuth()
  const [counts, setCounts] = useState({ followers: 0, following: 0 })
  const [isFollowing, setIsFollowing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [panel, setPanel] = useState<Panel>(null)
  const { follow, unfollow, toast, dismiss } = useFollowActions()

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchFollowCounts(profileId),
      !isMe && me ? isFollowingUser(me.id, profileId) : Promise.resolve(false),
    ])
      .then(([c, following]) => {
        if (cancelled) return
        setCounts(c)
        setIsFollowing(following)
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
    <View>
      <View className="mt-1 flex-row flex-wrap items-center gap-3">
        <Pressable onPress={() => setPanel('followers')} accessibilityRole="button">
          <Text className="text-xs text-base-400">
            <Text className="font-semibold text-base-200">{counts.followers}</Text>{' '}
            {counts.followers === 1 ? 'follower' : 'followers'}
          </Text>
        </Pressable>
        <Pressable onPress={() => setPanel('following')} accessibilityRole="button">
          <Text className="text-xs text-base-400">
            <Text className="font-semibold text-base-200">{counts.following}</Text> following
          </Text>
        </Pressable>
        {!isMe && me && (
          <FollowButton
            isFollowing={isFollowing}
            saving={saving}
            onFollow={handleFollow}
            onUnfollow={handleUnfollow}
          />
        )}
      </View>

      <FollowListSheet
        visible={panel !== null}
        userId={profileId}
        mode={panel ?? 'followers'}
        onClose={() => setPanel(null)}
        onMyFollowingCountChange={isMe ? handlePanelFollowingCountChange : undefined}
      />

      <Toast toast={toast} onDismiss={dismiss} />
    </View>
  )
}

import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import { Avatar } from '@/components/avatar'
import { EmptyState } from '@/components/empty-state'
import { ErrorText } from '@/components/error-text'
import { FollowButton } from '@/components/follow-button'
import { PickerSheet } from '@/components/picker-sheet'
import { Toast } from '@/components/toast'
import { useAuth } from '@/contexts/AuthContext'
import { useFollowActions } from '@/hooks/useFollowActions'
import { errorMessage } from '@/lib/format'
import { fetchFollowerIds, fetchFollowersWithUsers, fetchFollowingIds, fetchFollowingWithUsers } from '@/lib/follows'
import { profileHref } from '@/lib/navigation'
import type { AppUser } from '@/types'

interface FollowListSheetProps {
  visible: boolean
  userId: string
  mode: 'followers' | 'following'
  onClose: () => void
  onMyFollowingCountChange?: (delta: number) => void
}

const SKELETON_ROWS_MAX = 6

/** Followers/following list sheet, with a Follow/Unfollow button and "Follows you" badge per row. */
export function FollowListSheet({ visible, userId, mode, onClose, onMyFollowingCountChange }: FollowListSheetProps) {
  const { user: me } = useAuth()
  const [people, setPeople] = useState<AppUser[]>([])
  const [myFollowingIds, setMyFollowingIds] = useState<Set<string>>(new Set())
  const [myFollowerIds, setMyFollowerIds] = useState<Set<string>>(new Set())
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { follow, unfollow, toast, dismiss } = useFollowActions()

  useEffect(() => {
    if (!visible || !me) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(null)
    Promise.all([
      mode === 'followers' ? fetchFollowersWithUsers(userId) : fetchFollowingWithUsers(userId),
      fetchFollowingIds(me.id),
      fetchFollowerIds(me.id),
    ])
      .then(([list, followingIds, followerIds]) => {
        if (cancelled) return
        setPeople(list)
        setMyFollowingIds(followingIds)
        setMyFollowerIds(followerIds)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err, 'Failed to load this list.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [visible, userId, mode, me])

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

  function goToProfile(username: string) {
    onClose()
    router.push(profileHref(username))
  }

  return (
    <PickerSheet visible={visible} title={mode === 'followers' ? 'Followers' : 'Following'} onClose={onClose}>
      {error && <ErrorText className="mb-3 text-xs">{error}</ErrorText>}

      <ScrollView className="flex-1">
        {loading ? (
          <View className="gap-2">
            {Array.from({ length: SKELETON_ROWS_MAX }).map((_, i) => (
              <View key={i} className="h-12 rounded-lg bg-base-850/70" />
            ))}
          </View>
        ) : people.length === 0 ? (
          <EmptyState icon={mode === 'followers' ? '👋' : '🔍'}>
            <Text className="text-center text-xs text-base-500">
              {mode === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
            </Text>
          </EmptyState>
        ) : (
          <View className="gap-1.5">
            {people.map((p) => (
              <View key={p.id} className="flex-row items-center gap-2.5 rounded-lg p-1.5">
                <Pressable
                  onPress={() => goToProfile(p.username)}
                  accessibilityRole="link"
                  accessibilityLabel={`@${p.username}`}
                  className="min-w-0 flex-1 flex-row items-center gap-2.5"
                >
                  <Avatar username={p.username} size="xs" />
                  <View className="min-w-0">
                    <Text numberOfLines={1} className="text-sm font-medium text-base-100">
                      @{p.username}
                    </Text>
                    {myFollowerIds.has(p.id) && <Text className="text-[10px] text-base-500">Follows you</Text>}
                  </View>
                </Pressable>
                {me && me.id !== p.id && (
                  <FollowButton
                    size="sm"
                    isFollowing={myFollowingIds.has(p.id)}
                    saving={savingIds.has(p.id)}
                    onFollow={() => handleFollow(p.id)}
                    onUnfollow={() => handleUnfollow(p.id)}
                  />
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Toast toast={toast} onDismiss={dismiss} />
    </PickerSheet>
  )
}

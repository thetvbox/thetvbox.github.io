import { Link } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Avatar } from '@/components/avatar'
import { EmptyState } from '@/components/empty-state'
import { ErrorText } from '@/components/error-text'
import { FollowButton } from '@/components/follow-button'
import { Toast } from '@/components/toast'
import { useAuth } from '@/contexts/AuthContext'
import { useMembers } from '@/contexts/MembersContext'
import { useFollowActions } from '@/hooks/useFollowActions'
import { BottomTabInset } from '@/constants/theme'
import { SKELETON_ROWS } from '@/lib/constants'
import { fetchFollowerIds, fetchFollowingIds } from '@/lib/follows'
import { errorMessage } from '@/lib/format'
import { profileHref } from '@/lib/navigation'
import { fetchAllUsers } from '@/lib/users'
import type { AppUser } from '@/types'

const MEMBERS_BOTTOM_PADDING = BottomTabInset + 40

/** People directory: search plus a Follow/Following button and "Follows you" badge per row. */
export default function MembersScreen() {
  const { user: me } = useAuth()
  const { query } = useMembers()
  const [users, setUsers] = useState<AppUser[]>([])
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [followerIds, setFollowerIds] = useState<Set<string>>(new Set())
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { follow, unfollow, toast, dismiss } = useFollowActions()

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(null)
    Promise.all([
      fetchAllUsers(),
      me ? fetchFollowingIds(me.id) : Promise.resolve(new Set<string>()),
      me ? fetchFollowerIds(me.id) : Promise.resolve(new Set<string>()),
    ])
      .then(([allUsers, following, followers]) => {
        if (cancelled) return
        setUsers(allUsers)
        setFollowingIds(following)
        setFollowerIds(followers)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err, 'Failed to load members.'))
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
    <View className="flex-1 bg-base-950">
      <SafeAreaView edges={['top']} className="flex-1">
        <ScrollView contentContainerStyle={{ paddingBottom: MEMBERS_BOTTOM_PADDING }}>
          <View className="gap-2 px-4 pt-4">
            {error && <ErrorText>{error}</ErrorText>}

            {loading ? (
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <View key={i} className="h-16 rounded-xl bg-base-850/70" />
              ))
            ) : filtered.length === 0 ? (
              <EmptyState icon="🔍">
                <Text className="max-w-xs text-center text-sm text-base-500">
                  {users.length === 0 ? 'No one has registered yet.' : `No one matches "${query}".`}
                </Text>
              </EmptyState>
            ) : (
              filtered.map((u) => (
                <Link key={u.id} href={profileHref(u.username)} asChild>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`@${u.username}`}
                    className="flex-row items-center gap-3 rounded-xl border border-hairline bg-base-850/60 p-3 active:opacity-80"
                  >
                    <Avatar username={u.username} size="md" />
                    <View className="min-w-0 flex-1">
                      <Text numberOfLines={1} className="text-sm font-medium text-base-100">
                        @{u.username}
                        {me?.id === u.id && (
                          <Text className="text-[10px] font-normal text-base-400"> · You</Text>
                        )}
                      </Text>
                      <Text className="text-xs text-base-500">
                        {me?.id !== u.id && followerIds.has(u.id) ? 'Follows you · ' : ''}
                        Joined{' '}
                        {new Date(u.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                    {me && me.id !== u.id && (
                      <FollowButton
                        isFollowing={followingIds.has(u.id)}
                        saving={savingIds.has(u.id)}
                        onFollow={() => handleFollow(u.id)}
                        onUnfollow={() => handleUnfollow(u.id)}
                      />
                    )}
                  </Pressable>
                </Link>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <Toast toast={toast} onDismiss={dismiss} />
    </View>
  )
}

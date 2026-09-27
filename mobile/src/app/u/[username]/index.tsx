import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Avatar } from '@/components/avatar'
import { ErrorText } from '@/components/error-text'
import { ProfileActivity } from '@/components/profile-activity'
import { ProfileFollowSection } from '@/components/profile-follow-section'
import { ShareButton } from '@/components/share-button'
import { Toast } from '@/components/toast'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/useToast'
import { BottomTabInset } from '@/constants/theme'
import { compareHref } from '@/lib/navigation'
import { errorMessage } from '@/lib/format'
import { profileShareUrl } from '@/lib/routes'
import { fetchUserByUsername } from '@/lib/users'
import type { AppUser } from '@/types'

const PUBLIC_PROFILE_BOTTOM_PADDING = BottomTabInset + 40

/** Another member's public profile: header (avatar, follow section, share, compare) plus their ProfileActivity. */
export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>()
  const { user: me } = useAuth()
  const [profile, setProfile] = useState<AppUser | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const { toast, showInfo, showError, dismiss } = useToast()

  useEffect(() => {
    if (!username) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(undefined)
    setError(null)
    fetchUserByUsername(username)
      .then((found) => {
        if (!cancelled) setProfile(found)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err, 'Failed to load this profile.'))
      })
    return () => {
      cancelled = true
    }
  }, [username])

  const isMe = me?.username === username

  if (error || profile === null) {
    return (
      <View className="flex-1 items-center justify-center bg-base-950 px-6">
        <Stack.Screen options={{ title: 'Profile' }} />
        <ErrorText className="text-center text-sm">
          {error ?? `No one found with username "${username}".`}
        </ErrorText>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-base-950">
      <Stack.Screen options={{ title: profile ? `@${profile.username}` : 'Profile' }} />
      <SafeAreaView edges={['bottom']} className="flex-1">
        <ScrollView contentContainerStyle={{ paddingBottom: PUBLIC_PROFILE_BOTTOM_PADDING }}>
          <View className="gap-6 px-4 pt-4">
            <View className="flex-row flex-wrap items-center justify-between gap-4">
              <View className="flex-shrink flex-row items-center gap-3.5">
                <Avatar username={profile?.username ?? ''} size="lg" />
                <View>
                  <Text className="text-xs uppercase tracking-wide text-base-500">
                    {isMe ? 'This is you' : 'Member'}
                  </Text>
                  {profile === undefined ? (
                    <View className="mt-1 h-6 w-32 rounded bg-base-800" />
                  ) : (
                    <Text className="text-lg font-semibold text-base-100">@{profile.username}</Text>
                  )}
                  {profile && (
                    <ProfileFollowSection profileId={profile.id} username={profile.username} isMe={isMe} />
                  )}
                </View>
              </View>
              {profile && (
                <View className="shrink-0 flex-row items-center gap-2">
                  <ShareButton
                    title={`@${profile.username} on TV Box`}
                    url={profileShareUrl(profile.username)}
                    onResult={(result) => {
                      if (result === 'copied') showInfo('Link copied to clipboard')
                      if (result === 'failed') showError('Failed to share this profile.')
                    }}
                  />
                  {isMe ? (
                    <Pressable
                      onPress={() => router.push('/profile')}
                      accessibilityRole="link"
                      className="rounded-lg border border-hairline-strong px-3.5 py-2"
                    >
                      <Text className="text-sm text-base-300">Edit / sign out</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => router.push(compareHref(username ?? ''))}
                      accessibilityRole="link"
                      className="rounded-lg border border-hairline-strong px-3.5 py-2"
                    >
                      <Text className="text-sm text-base-300">Compare ratings</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>

            {profile && <ProfileActivity userId={profile.id} username={profile.username} />}
          </View>
        </ScrollView>
      </SafeAreaView>

      <Toast toast={toast} onDismiss={dismiss} />
    </View>
  )
}

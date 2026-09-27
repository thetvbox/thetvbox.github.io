import { MenuView, type NativeActionEvent } from '@expo/ui/community/menu'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Avatar } from '@/components/avatar'
import { ProfileActivity, PROFILE_ACTIVITY_TABS } from '@/components/profile-activity'
import type { ProfileActivityTab } from '@/components/profile-activity'
import { ProfileFollowSection } from '@/components/profile-follow-section'
import { PushNotificationsSheet } from '@/components/push-notifications-sheet'
import { SiriShortcutsSheet } from '@/components/siri-shortcuts-sheet'
import { CreditsSheet } from '@/components/credits-sheet'
import { useAuth } from '@/contexts/AuthContext'
import { BottomTabInset } from '@/constants/theme'
import { profileHref } from '@/lib/navigation'

const PROFILE_BOTTOM_PADDING = BottomTabInset + 40

/** The signed-in user's own profile: their activity plus a "More" menu for year-in-review, the public view of this profile, notifications, and signing out -- ported from web's Profile.tsx (appearance is handled automatically/natively and isn't ported, see the progress notes). */
export default function ProfileScreen() {
  const { user, signOut } = useAuth()
  const { tab } = useLocalSearchParams<{ tab?: string }>()
  const initialTab: ProfileActivityTab | undefined =
    tab && (PROFILE_ACTIVITY_TABS as string[]).includes(tab) ? (tab as ProfileActivityTab) : undefined
  const [pushSheetVisible, setPushSheetVisible] = useState(false)
  const [siriSheetVisible, setSiriSheetVisible] = useState(false)
  const [creditsSheetVisible, setCreditsSheetVisible] = useState(false)

  async function handleMenuAction(event: NativeActionEvent) {
    const id = event.nativeEvent.event
    if (id === 'recap') router.push('/recap')
    else if (id === 'public' && user) router.push(profileHref(user.username))
    else if (id === 'notifications') setPushSheetVisible(true)
    else if (id === 'siri') setSiriSheetVisible(true)
    else if (id === 'credits') setCreditsSheetVisible(true)
    else if (id === 'signout') await signOut()
  }

  return (
    <View className="flex-1 bg-base-950">
      <SafeAreaView edges={['bottom']} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: PROFILE_BOTTOM_PADDING }}>
          <View className="mb-6 flex-row flex-wrap items-start justify-between gap-4">
            <View className="flex-row items-center gap-3.5">
              <Avatar username={user?.username ?? ''} size="lg" />
              <View>
                <Text className="text-xs uppercase tracking-wide text-base-500">Signed in as</Text>
                <Text className="text-lg font-semibold text-base-100">@{user?.username}</Text>
                <Text className="text-xs text-base-500">{user?.email}</Text>
                {user && <ProfileFollowSection profileId={user.id} username={user.username} isMe />}
              </View>
            </View>

            <MenuView
              onPressAction={handleMenuAction}
              actions={[
                { id: 'recap', title: 'Year in review', image: 'sparkles' },
                { id: 'public', title: 'Public view', image: 'person.crop.circle' },
                { id: 'notifications', title: 'Notifications', image: 'bell' },
                { id: 'siri', title: 'Siri & Shortcuts', image: 'mic' },
                { id: 'credits', title: 'Credits & Privacy', image: 'info.circle' },
                {
                  id: 'signout',
                  title: 'Sign out',
                  image: 'rectangle.portrait.and.arrow.right',
                  attributes: { destructive: true },
                },
              ]}
            >
              <View className="shrink-0 rounded-full border border-hairline-strong px-3.5 py-2">
                <Text className="text-sm font-medium text-base-300">More</Text>
              </View>
            </MenuView>
          </View>

          {user && <ProfileActivity userId={user.id} username={user.username} initialTab={initialTab} />}
        </ScrollView>
      </SafeAreaView>
      {user && (
        <PushNotificationsSheet
          visible={pushSheetVisible}
          userId={user.id}
          onClose={() => setPushSheetVisible(false)}
        />
      )}
      {user && (
        <SiriShortcutsSheet visible={siriSheetVisible} userId={user.id} onClose={() => setSiriSheetVisible(false)} />
      )}
      <CreditsSheet visible={creditsSheetVisible} onClose={() => setCreditsSheetVisible(false)} />
    </View>
  )
}

import { SymbolView } from 'expo-symbols'
import { Link } from 'expo-router'
import { Pressable, Text, View } from 'react-native'

import { Avatar } from '@/components/avatar'
import { useThemeColors } from '@/hooks/use-theme-colors'
import { formatShortDate } from '@/lib/date'
import { ROW_CARD_BASE_CLASSES } from '@/lib/rowCard'
import { profileHref } from '@/lib/navigation'
import type { FollowActivityEvent } from '@/lib/showActivity'

const FOLLOW_ICON_SIZE = 16

/** One "X started following Y" row, linking to the person who was followed. */
export function FollowActivityRow({ event }: { event: FollowActivityEvent }) {
  const theme = useThemeColors()

  return (
    <Link href={profileHref(event.followedUsername)} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`@${event.followerUsername} started following @${event.followedUsername}`}
        className={`flex-row items-center gap-3 active:opacity-80 ${ROW_CARD_BASE_CLASSES}`}
      >
        <Avatar username={event.followerUsername} size="sm" />
        <View className="h-12 w-9 shrink-0 items-center justify-center rounded-md bg-base-800">
          <SymbolView name="person.badge.plus" size={FOLLOW_ICON_SIZE} tintColor={theme.accent} />
        </View>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-sm text-base-200">
            <Text className="font-medium text-base-100">@{event.followerUsername}</Text> started following{' '}
            <Text className="font-medium text-base-100">@{event.followedUsername}</Text>
          </Text>
          <Text className="text-xs text-base-500">{formatShortDate(event.at)}</Text>
        </View>
      </Pressable>
    </Link>
  )
}

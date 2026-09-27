import { SymbolView } from 'expo-symbols'
import { Link } from 'expo-router'
import { Pressable, Text, View } from 'react-native'

import { Avatar } from '@/components/avatar'
import { PosterThumb } from '@/components/poster-thumb'
import { useThemeColors } from '@/hooks/use-theme-colors'
import { formatShortDate } from '@/lib/date'
import { ROW_CARD_BASE_CLASSES } from '@/lib/rowCard'
import { showDiaryHref } from '@/lib/navigation'
import type { GroupActivityEvent } from '@/lib/showActivity'

const STAR_ICON_SIZE = 11

/** One "who did what" row -- shared by the Home teaser and the full Activity feed. */
export function ActivityRow({ event }: { event: GroupActivityEvent }) {
  const theme = useThemeColors()

  return (
    <Link href={showDiaryHref(event.username, event.showId)} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`@${event.username}`}
        className={`flex-row items-center gap-3 active:opacity-80 ${ROW_CARD_BASE_CLASSES}`}
      >
        <Avatar username={event.username} size="sm" />
        <PosterThumb posterPath={event.showPosterPath} size="sm" />
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-sm text-base-200">
            <Text className="font-medium text-base-100">@{event.username}</Text>{' '}
            {event.finished
              ? `finished ${event.showName}`
              : event.seasonNumber !== null
                ? `rated ${event.showName} Season ${event.seasonNumber}`
                : `rated ${event.showName}`}
          </Text>
          <Text className="text-xs text-base-500">
            {event.atUnknown ? 'a while ago' : formatShortDate(event.at)}
            {event.finished && event.episodeCount ? ` · ${event.episodeCount} episodes` : ''}
          </Text>
        </View>
        {event.rating !== null && (
          <View className="shrink-0 flex-row items-center gap-1">
            <Text className="text-sm font-semibold text-star">{event.rating.toFixed(1)}</Text>
            <SymbolView name="star.fill" size={STAR_ICON_SIZE} tintColor={theme.star} />
          </View>
        )}
      </Pressable>
    </Link>
  )
}

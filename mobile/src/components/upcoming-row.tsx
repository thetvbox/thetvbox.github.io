import { Link } from 'expo-router'
import { Pressable, Text, View } from 'react-native'

import { PosterThumb } from '@/components/poster-thumb'
import { formatShortDate } from '@/lib/date'
import { ROW_CARD_BASE_CLASSES } from '@/lib/rowCard'
import { showHref } from '@/lib/navigation'

export interface UpcomingItem {
  showId: number
  showName: string
  showPosterPath: string | null
  seasonNumber: number
  episodeNumber: number
  airDate: string
}

/** One "what's airing next" row for Home's Upcoming list. */
export function UpcomingRow({ item }: { item: UpcomingItem }) {
  return (
    <Link href={showHref(item.showId)} asChild>
      <Pressable
        className={`flex-row items-center gap-3 active:opacity-70 ${ROW_CARD_BASE_CLASSES}`}
        accessibilityRole="link"
        accessibilityLabel={`${item.showName}, season ${item.seasonNumber} episode ${item.episodeNumber}, airs ${formatShortDate(item.airDate)}`}
      >
        <PosterThumb posterPath={item.showPosterPath} size="sm" />
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-sm font-medium text-base-100">
            {item.showName}
          </Text>
          <Text className="text-xs text-base-500">
            Season {item.seasonNumber} · Episode {item.episodeNumber}
          </Text>
        </View>
        <View className="shrink-0 rounded-full bg-accent-500/10 px-2.5 py-1">
          <Text className="text-xs font-medium text-accent-400">{formatShortDate(item.airDate)}</Text>
        </View>
      </Pressable>
    </Link>
  )
}

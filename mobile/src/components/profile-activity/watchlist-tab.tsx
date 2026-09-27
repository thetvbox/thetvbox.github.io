import { router } from 'expo-router'
import { Pressable, Text, View } from 'react-native'

import { EmptyState } from '@/components/empty-state'
import { PosterThumb } from '@/components/poster-thumb'
import { formatShortDate } from '@/lib/date'
import { showHref } from '@/lib/navigation'
import { ROW_CARD_BASE_CLASSES } from '@/lib/rowCard'
import type { WatchlistItem } from '@/types'

interface WatchlistTabProps {
  items: WatchlistItem[]
  isMe: boolean
  onRemove: (item: WatchlistItem) => void
}

/** Watchlist tab body -- shows saved for later, with a remove action for the owner. */
export function WatchlistTab({ items, isMe, onRemove }: WatchlistTabProps) {
  if (items.length === 0) {
    return (
      <EmptyState icon="🔖">
        <Text className="max-w-xs text-center text-sm text-base-500">
          {isMe ? 'Nothing on your watchlist yet. ' : 'Nothing here yet.'}
          {isMe && (
            <>
              <Text className="text-accent-400" onPress={() => router.push('/search')}>
                Find a show
              </Text>{' '}
              to save one for later.
            </>
          )}
        </Text>
      </EmptyState>
    )
  }

  return (
    <View className="gap-2">
      {items.map((w) => (
        <View key={w.id} className={`flex-row items-center gap-3 ${ROW_CARD_BASE_CLASSES}`}>
          <Pressable
            onPress={() => router.push(showHref(w.show_id))}
            accessibilityRole="link"
            className="min-w-0 flex-1 flex-row items-center gap-3"
          >
            <PosterThumb posterPath={w.show_poster_path} />
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="text-sm font-medium text-base-100">
                {w.show_name}
              </Text>
              <Text className="text-xs text-base-400">Added {formatShortDate(w.added_at)}</Text>
            </View>
          </Pressable>
          {isMe && (
            <Pressable onPress={() => onRemove(w)} accessibilityRole="button">
              <Text className="shrink-0 text-xs text-base-500">Remove</Text>
            </Pressable>
          )}
        </View>
      ))}
    </View>
  )
}

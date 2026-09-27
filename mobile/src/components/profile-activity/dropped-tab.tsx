import { router } from 'expo-router'
import { Pressable, Text, View } from 'react-native'

import { EmptyState } from '@/components/empty-state'
import { PosterThumb } from '@/components/poster-thumb'
import { formatShortDate } from '@/lib/date'
import { showHref } from '@/lib/navigation'
import { ROW_CARD_BASE_CLASSES } from '@/lib/rowCard'
import type { ShowDropped } from '@/types'

interface DroppedTabProps {
  items: ShowDropped[]
  isMe: boolean
  onResume: (item: ShowDropped) => void
}

/** Dropped tab body: deliberately-stopped shows with a resume action. */
export function DroppedTab({ items, isMe, onResume }: DroppedTabProps) {
  if (items.length === 0) {
    return (
      <EmptyState icon="🚫">
        <Text className="max-w-xs text-center text-sm text-base-500">
          {isMe ? "Nothing dropped. Shows you drop from a show's own page show up here." : 'Nothing here yet.'}
        </Text>
      </EmptyState>
    )
  }

  return (
    <View className="gap-2">
      {items.map((d) => (
        <View key={d.id} className={`flex-row items-center gap-3 ${ROW_CARD_BASE_CLASSES}`}>
          <Pressable
            onPress={() => router.push(showHref(d.show_id))}
            accessibilityRole="link"
            className="min-w-0 flex-1 flex-row items-center gap-3"
          >
            <PosterThumb posterPath={d.show_poster_path} />
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="text-sm font-medium text-base-100">
                {d.show_name}
              </Text>
              <Text className="text-xs text-base-400">Dropped {formatShortDate(d.dropped_at)}</Text>
            </View>
          </Pressable>
          {isMe && (
            <Pressable onPress={() => onResume(d)} accessibilityRole="button">
              <Text className="shrink-0 text-xs text-base-500">Resume</Text>
            </Pressable>
          )}
        </View>
      ))}
    </View>
  )
}

import { View } from 'react-native'

import { PosterGrid } from '@/components/poster-grid'
import { POSTER_ASPECT_RATIO } from '@/lib/constants'

function ShowCardSkeleton({ progress = false }: { progress?: boolean }) {
  return (
    <View>
      <View className="rounded-2xl bg-base-800" style={{ aspectRatio: POSTER_ASPECT_RATIO }} />
      <View className="mt-2 h-3.5 w-3/4 rounded bg-base-800" />
      {progress ? (
        <View className="mt-1.5 h-1.5 w-full rounded-full bg-base-800" />
      ) : (
        <View className="mt-1.5 h-3 w-1/3 rounded bg-base-800" />
      )}
    </View>
  )
}

/** Loading placeholder mirroring a poster grid's layout so real content doesn't pop in. */
export function ShowGridSkeleton({ count = 12, progress = false }: { count?: number; progress?: boolean }) {
  const items = Array.from({ length: count }, (_, i) => i)
  return (
    <PosterGrid data={items} keyExtractor={(i) => String(i)} renderItem={() => <ShowCardSkeleton progress={progress} />} />
  )
}

/** Mirrors an episode row's layout so it doesn't pop on load. */
export function EpisodeRowSkeleton() {
  return (
    <View className="flex-row gap-4 rounded-xl border border-hairline bg-base-850/60 p-4">
      <View className="h-20 w-32 shrink-0 rounded-lg bg-base-800" />
      <View className="min-w-0 flex-1 gap-2 py-1">
        <View className="h-2.5 w-16 rounded bg-base-800" />
        <View className="h-3.5 w-2/3 rounded bg-base-800" />
        <View className="h-3 w-full rounded bg-base-800" />
        <View className="h-3 w-4/5 rounded bg-base-800" />
      </View>
    </View>
  )
}

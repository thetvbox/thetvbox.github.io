import { View } from 'react-native'

import type { SeasonSegment } from '@/lib/seasonProgress'

function progressPct(segment: SeasonSegment | undefined): number {
  if (!segment || segment.total <= 0) return 0
  return Math.min(100, (segment.watched / segment.total) * 100)
}

/** Story-bar progress: one capsule per season, falling back to a single bar for single-season shows. */
export function SeasonProgressBar({ segments }: { segments: SeasonSegment[] }) {
  if (segments.length <= 1) {
    return (
      <View className="h-1 w-full overflow-hidden rounded-full bg-base-800">
        <View className="h-full rounded-full bg-accent-500" style={{ width: `${progressPct(segments[0])}%` }} />
      </View>
    )
  }

  return (
    <View className="h-1 w-full flex-row items-center" style={{ gap: 2 }}>
      {segments.map((segment) => (
        <View key={segment.seasonNumber} className="h-full min-w-[3px] flex-1 overflow-hidden rounded-full bg-base-800">
          <View className="h-full rounded-full bg-accent-500" style={{ width: `${progressPct(segment)}%` }} />
        </View>
      ))}
    </View>
  )
}

import type { ReactNode } from 'react'
import { useWindowDimensions, View } from 'react-native'

import { POSTER_GRID_COLUMNS, POSTER_GRID_GAP_PX } from '@/lib/constants'

interface PosterGridProps<T> {
  data: T[]
  keyExtractor: (item: T) => string
  renderItem: (item: T) => ReactNode
  gutterPx?: number
}

/** Fixed-column poster grid for a short, non-virtualized list of tiles -- RN has no CSS grid, so each tile's width is computed from screen width rather than relying on flex-wrap percentages, which round unevenly once `gap` is involved. */
export function PosterGrid<T>({ data, keyExtractor, renderItem, gutterPx = 32 }: PosterGridProps<T>) {
  const { width } = useWindowDimensions()
  const contentWidth = width - gutterPx
  const itemWidth = (contentWidth - POSTER_GRID_GAP_PX * (POSTER_GRID_COLUMNS - 1)) / POSTER_GRID_COLUMNS

  return (
    <View className="flex-row flex-wrap" style={{ gap: POSTER_GRID_GAP_PX }}>
      {data.map((item) => (
        <View key={keyExtractor(item)} style={{ width: itemWidth }}>
          {renderItem(item)}
        </View>
      ))}
    </View>
  )
}

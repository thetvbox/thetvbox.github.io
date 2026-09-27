import { Image } from 'expo-image'
import { View } from 'react-native'

import { posterUrl } from '@/lib/tmdb'
import { POSTER_THUMB_SIZE } from '@/lib/constants'

const SIZE_CLASSES = {
  sm: 'h-12 w-9',
  md: 'h-14 w-10',
  lg: 'h-16 w-11',
} as const

interface PosterThumbProps {
  posterPath: string | null
  size?: keyof typeof SIZE_CLASSES
}

/** Small poster thumbnail for list rows, the row equivalent of PosterTile's grid-card art box. */
export function PosterThumb({ posterPath, size = 'md' }: PosterThumbProps) {
  const poster = posterUrl(posterPath, POSTER_THUMB_SIZE)
  return (
    <View className={`${SIZE_CLASSES[size]} shrink-0 overflow-hidden rounded-md bg-base-800`}>
      {poster && <Image source={{ uri: poster }} contentFit="cover" transition={200} style={{ flex: 1 }} />}
    </View>
  )
}

import { Image } from 'expo-image'
import type { ReactNode } from 'react'
import { Text, View } from 'react-native'

import { posterUrl } from '@/lib/tmdb'
import { POSTER_ASPECT_RATIO } from '@/lib/constants'

interface PosterTileProps {
  posterPath: string | null
  name: string
  children?: ReactNode
}

/** The poster art box shared by every poster card, with badges/overlays passed in as children. */
export function PosterTile({ posterPath, name, children }: PosterTileProps) {
  const poster = posterUrl(posterPath)
  return (
    <View className="relative overflow-hidden rounded-2xl bg-base-800" style={{ aspectRatio: POSTER_ASPECT_RATIO }}>
      {poster ? (
        <Image
          source={{ uri: poster }}
          accessibilityLabel={name}
          contentFit="cover"
          transition={200}
          style={{ flex: 1 }}
        />
      ) : (
        <View className="flex-1 items-center justify-center p-3">
          <Text className="text-center text-xs text-base-400">{name}</Text>
        </View>
      )}
      {children}
    </View>
  )
}

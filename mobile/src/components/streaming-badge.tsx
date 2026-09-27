import { Image } from 'expo-image'
import { View } from 'react-native'

import { providerLogoUrl } from '@/lib/tmdb'
import type { ResolvedProvider } from '@/lib/streamingProvider'

/** Small corner badge showing where a show is free to stream; renders nothing without a logo. */
export function StreamingBadge({ provider }: { provider: ResolvedProvider | null | undefined }) {
  const logo = provider ? providerLogoUrl(provider.logo_path) : null
  if (!provider || !logo) return null

  return (
    <View
      className="absolute right-1.5 top-1.5 h-6 w-6 overflow-hidden rounded-md"
      accessibilityLabel={provider.provider_name}
    >
      <Image source={{ uri: logo }} contentFit="cover" style={{ flex: 1 }} />
    </View>
  )
}

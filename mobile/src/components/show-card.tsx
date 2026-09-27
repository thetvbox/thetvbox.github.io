import { Link } from 'expo-router'
import { Pressable, Text } from 'react-native'

import { PosterTile } from '@/components/poster-tile'
import { StreamingBadge } from '@/components/streaming-badge'
import { showHref } from '@/lib/navigation'
import { yearFromDate } from '@/lib/tmdb'
import type { ResolvedProvider } from '@/lib/streamingProvider'
import type { TmdbShowSummary } from '@/types'

interface ShowCardProps {
  show: TmdbShowSummary
  provider?: ResolvedProvider | null
}

/** One poster tile in a search/trending results grid, linking to the show's detail screen. */
export function ShowCard({ show, provider }: ShowCardProps) {
  const year = yearFromDate(show.first_air_date)
  const label = `${show.name}${year ? ` (${year})` : ''}`

  return (
    <Link href={showHref(show.id)} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={label} className="active:opacity-80">
        <PosterTile posterPath={show.poster_path} name={show.name}>
          <StreamingBadge provider={provider} />
        </PosterTile>
        <Text numberOfLines={1} className="mt-2 text-sm font-medium text-base-100">
          {show.name}
        </Text>
        {year && <Text className="text-xs text-base-400">{year}</Text>}
      </Pressable>
    </Link>
  )
}

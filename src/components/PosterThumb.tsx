import { buildSrcSet, posterUrl } from '../lib/tmdb'
import { POSTER_THUMB_SIZE } from '../lib/constants'

const SIZE_CLASSES = {
  sm: 'h-12 w-9',
  md: 'h-14 w-10',
  lg: 'h-16 w-11',
} as const

/** Actual rendered box width per size, in px (matches the w-9/w-10/w-11 above), for the `sizes` attribute. */
const BOX_WIDTH_PX = {
  sm: 36,
  md: 40,
  lg: 44,
} as const

/** Small poster thumbnail for list rows, the row equivalent of PosterTile's grid-card art box. */
export default function PosterThumb({
  posterPath,
  size = 'md',
}: {
  posterPath: string | null
  size?: keyof typeof SIZE_CLASSES
}) {
  const poster = posterUrl(posterPath, POSTER_THUMB_SIZE)
  return (
    <div className={`${SIZE_CLASSES[size]} shrink-0 overflow-hidden rounded-md bg-base-800`}>
      {poster && (
        <img
          src={poster}
          srcSet={buildSrcSet(posterPath, ['w92', 'w185'])}
          sizes={`${BOX_WIDTH_PX[size]}px`}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      )}
    </div>
  )
}

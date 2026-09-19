import type { ReactNode } from 'react'
import { buildSrcSet, posterUrl } from '../lib/tmdb'

export const POSTER_GRID_CLASSES = 'grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'

/** Mirrors POSTER_GRID_CLASSES's breakpoints, so the browser requests a poster sized for the actual column width. */
const POSTER_GRID_SIZES =
  '(min-width: 1024px) 182px, (min-width: 768px) 220px, (min-width: 640px) 210px, 171px'

/** The poster art box shared by every poster card, with badges/overlays passed in as children. */
export default function PosterTile({
  posterPath,
  name,
  children,
}: {
  posterPath: string | null
  name: string
  children?: ReactNode
}) {
  const poster = posterUrl(posterPath)
  return (
    <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-base-800 ring-1 ring-hairline transition-[transform,box-shadow] duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_32px_-8px_rgba(139,92,246,0.35)]">
      {poster ? (
        <img
          src={poster}
          srcSet={buildSrcSet(posterPath, ['w185', 'w342', 'w500'])}
          sizes={POSTER_GRID_SIZES}
          alt={name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-3 text-center text-xs text-base-400">
          {name}
        </div>
      )}
      {children}
    </div>
  )
}

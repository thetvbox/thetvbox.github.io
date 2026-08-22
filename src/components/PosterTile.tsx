import type { ReactNode } from 'react'
import { posterUrl } from '../lib/tmdb'

/** Grid layout shared by every poster grid in the app (Home, Search,
 * History, Lists) -- 2 columns up to 5 as the viewport grows. */
export const POSTER_GRID_CLASSES = 'grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'

/** The poster art box itself -- image or name-fallback, rounded corners,
 * hover lift/scale/shadow -- shared by every poster card (ShowCard, Home's
 * Now Watching/Watchlist grids, ListDetail, HistorySection). Callers own
 * everything below the poster (title, subtitle) and can pass badges/overlays
 * (StreamingBadge, a remove button, a rating pill) as children. */
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
    <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-base-800 ring-1 ring-hairline transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_32px_-8px_rgba(139,92,246,0.35)]">
      {poster ? (
        <img
          src={poster}
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

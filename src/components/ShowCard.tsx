import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { yearFromDate } from '../lib/tmdb'
import { staggerTileMotion } from '../lib/motion'
import type { ResolvedProvider } from '../lib/streamingProvider'
import { showRoute } from '../lib/routes'
import StreamingBadge from './StreamingBadge'
import PosterTile from './PosterTile'
import type { TmdbShowSummary } from '../types'

export default function ShowCard({
  show,
  provider,
  index = 0,
}: {
  show: TmdbShowSummary
  provider?: ResolvedProvider | null
  /** Position in its grid, for a staggered entrance matching every other poster grid in the app. */
  index?: number
}) {
  const year = yearFromDate(show.first_air_date)

  return (
    <motion.div {...staggerTileMotion(index)}>
      <Link
        to={showRoute(show.id)}
        className="group block"
        aria-label={`${show.name}${year ? ` (${year})` : ''}`}
      >
        <PosterTile posterPath={show.poster_path} name={show.name}>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <StreamingBadge provider={provider} />
        </PosterTile>
        <p className="mt-2 truncate text-sm font-medium text-base-100">{show.name}</p>
        {year && <p className="text-xs text-base-400">{year}</p>}
      </Link>
    </motion.div>
  )
}

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { staggerRowMotion } from '../../lib/motion'
import { formatShortDate } from '../../lib/date'
import EmptyState from '../EmptyState'
import PosterThumb from '../PosterThumb'
import type { WatchlistItem } from '../../types'

interface WatchlistTabProps {
  items: WatchlistItem[]
  isMe: boolean
  onRemove: (item: WatchlistItem) => void
}

/** Watchlist tab body -- shows saved for later, with a remove action for the owner. */
export default function WatchlistTab({ items, isMe, onRemove }: WatchlistTabProps) {
  if (items.length === 0) {
    return (
      <EmptyState icon="🔖">
        <p className="max-w-xs text-sm text-base-500">
          {isMe ? 'Nothing on your watchlist yet. ' : 'Nothing here yet. '}
          {isMe && (
            <>
              <Link to="/search" className="text-accent-400 hover:underline">
                Find a show
              </Link>{' '}
              to save one for later.
            </>
          )}
        </p>
      </EmptyState>
    )
  }

  return (
    <ul className="space-y-2">
      {items.map((w, i) => (
        <motion.li
          key={w.id}
          {...staggerRowMotion(i, 8)}
          className="flex items-center gap-3 rounded-xl border border-hairline bg-base-850/60 p-2.5 transition-colors duration-200 hover:bg-base-800/70"
        >
          <Link to={`/show/${w.show_id}`} className="flex min-w-0 flex-1 items-center gap-3">
            <PosterThumb posterPath={w.show_poster_path} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-base-100">{w.show_name}</p>
              <p className="text-xs text-base-400">Added {formatShortDate(w.added_at)}</p>
            </div>
          </Link>
          {isMe && (
            <button
              type="button"
              onClick={() => onRemove(w)}
              className="shrink-0 text-xs text-base-500 hover:text-danger"
            >
              Remove
            </button>
          )}
        </motion.li>
      ))}
    </ul>
  )
}

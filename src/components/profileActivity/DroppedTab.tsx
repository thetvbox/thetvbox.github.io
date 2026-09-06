import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { staggerRowMotion } from '../../lib/motion'
import { formatShortDate } from '../../lib/date'
import EmptyState from '../EmptyState'
import PosterThumb from '../PosterThumb'
import { showRoute } from '../../lib/routes'
import type { ShowDropped } from '../../types'

interface DroppedTabProps {
  items: ShowDropped[]
  isMe: boolean
  onResume: (item: ShowDropped) => void
}

/** Dropped tab body -- shows deliberately stopped, with a resume action for
 * the owner. Same layout as WatchlistTab; "Remove" becomes "Resume". */
export default function DroppedTab({ items, isMe, onResume }: DroppedTabProps) {
  if (items.length === 0) {
    return (
      <EmptyState icon="🚫">
        <p className="max-w-xs text-sm text-base-500">
          {isMe ? "Nothing dropped. Shows you drop from a show's own page show up here." : 'Nothing here yet.'}
        </p>
      </EmptyState>
    )
  }

  return (
    <ul className="space-y-2">
      {items.map((d, i) => (
        <motion.li
          key={d.id}
          {...staggerRowMotion(i, 8)}
          className="flex items-center gap-3 rounded-xl border border-hairline bg-base-850/60 p-2.5 transition-colors duration-200 hover:bg-base-800/70"
        >
          <Link to={showRoute(d.show_id)} className="flex min-w-0 flex-1 items-center gap-3">
            <PosterThumb posterPath={d.show_poster_path} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-base-100">{d.show_name}</p>
              <p className="text-xs text-base-400">Dropped {formatShortDate(d.dropped_at)}</p>
            </div>
          </Link>
          {isMe && (
            <button
              type="button"
              onClick={() => onResume(d)}
              className="shrink-0 text-xs text-base-500 hover:text-accent-400"
            >
              Resume
            </button>
          )}
        </motion.li>
      ))}
    </ul>
  )
}

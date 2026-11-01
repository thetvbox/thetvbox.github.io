import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { staggerRowMotion } from '../../lib/motion'
import { offscreenSkipStyle } from '../../lib/layout'
import { ROW_CARD_BASE_CLASSES } from '../../lib/rowCard'
import PosterThumb from '../PosterThumb'
import { showRoute } from '../../lib/routes'

const ACTION_TONE_CLASSES = { accent: 'hover:text-accent-400', danger: 'hover:text-danger' } as const

/** One show row in a profile tab: poster, name, a dated subtitle, and an optional owner-only action. */
export default function ShowRowItem({
  index,
  showId,
  showName,
  posterPath,
  subtitle,
  action,
}: {
  index: number
  showId: number
  showName: string
  posterPath: string | null
  subtitle: string
  action?: { label: string; tone: keyof typeof ACTION_TONE_CLASSES; onClick: () => void }
}) {
  return (
    <motion.li
      {...staggerRowMotion(index, 8)}
      style={offscreenSkipStyle(72)}
      className={`flex items-center gap-3 ${ROW_CARD_BASE_CLASSES}`}
    >
      <Link to={showRoute(showId)} className="flex min-w-0 flex-1 items-center gap-3">
        <PosterThumb posterPath={posterPath} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-base-100">{showName}</p>
          <p className="text-xs text-base-400">{subtitle}</p>
        </div>
      </Link>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={`shrink-0 text-xs text-base-500 ${ACTION_TONE_CLASSES[action.tone]}`}
        >
          {action.label}
        </button>
      )}
    </motion.li>
  )
}

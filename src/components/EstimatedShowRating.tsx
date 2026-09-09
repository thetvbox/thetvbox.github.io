import { useState } from 'react'
import { motion } from 'framer-motion'
import { INLINE_PANEL_ANIMATE, INLINE_PANEL_INITIAL, INLINE_PANEL_TRANSITION } from '../lib/motion'
import StarGlyph from './StarGlyph'
import { pluralSuffix } from '../lib/format'
import type { SeasonRatingWithUser } from '../types'

interface EstimatedShowRatingProps {
  average: number
  seasons: SeasonRatingWithUser[]
}

/**
 * Shown next to "Rate this show" once the user has rated 1+ seasons but not the show itself --
 * a live average of just those seasons, expandable to see which ones and how they were rated.
 */
export default function EstimatedShowRating({ average, seasons }: EstimatedShowRatingProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1 text-xs text-base-400 hover:text-base-200"
      >
        <StarGlyph size={13} />
        <span className="text-base-300">~{average.toFixed(1)}</span>
        <span className="text-base-500">
          ({seasons.length} season{pluralSuffix(seasons.length)} rated)
        </span>
      </button>

      {open && (
        <motion.ul
          initial={INLINE_PANEL_INITIAL}
          animate={INLINE_PANEL_ANIMATE}
          transition={INLINE_PANEL_TRANSITION}
          className="mt-2.5 max-w-xs space-y-1.5 border-t border-hairline pt-2.5"
        >
          {seasons
            .slice()
            .sort((a, b) => a.season_number - b.season_number)
            .map((s) => (
              <li key={s.id} className="flex items-center justify-between text-xs">
                <span className="text-base-300">{s.season_name ?? `Season ${s.season_number}`}</span>
                <span className="flex items-center gap-1 text-star">
                  {s.rating.toFixed(1)}
                  <StarGlyph size={14} />
                </span>
              </li>
            ))}
        </motion.ul>
      )}
    </div>
  )
}

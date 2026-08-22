import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import StarRating from './StarRating'
import StarGlyph from './StarGlyph'

/** Minimal shape both ShowRatingWithUser and SeasonRatingWithUser satisfy --
 * this component doesn't care which kind of rating it's showing. */
interface RatingEntry {
  id: string
  user_id: string
  rating: number
  users: { username: string } | null
}

interface RatingSummaryProps {
  ratings: RatingEntry[]
  myRating: number
  onChange: (value: number) => void | Promise<void>
  saving?: boolean
  currentUserId?: string
  size?: 'sm' | 'md' | 'lg'
  emptyLabel?: string
  /** Screen-reader label for the star input itself, e.g. "Rate this show" or
   * "Rate this season" -- passed through to StarRating's aria-label instead
   * of it guessing, since this component (and StarRating underneath it) has
   * no way to know which context it's being used in otherwise. */
  ratingLabel: string
}

/**
 * Star input + "here's what everyone else thought" -- shared by the show-
 * level rating and the per-season one, since both are exactly the same
 * interaction (rate it, see the crowd's average, expand to see who rated
 * what) just scoped to a different rating list.
 */
export default function RatingSummary({
  ratings,
  myRating,
  onChange,
  saving = false,
  currentUserId,
  size = 'md',
  emptyLabel = "You're the first to rate this",
  ratingLabel,
}: RatingSummaryProps) {
  const [open, setOpen] = useState(false)
  const others = ratings.filter((r) => r.user_id !== currentUserId)
  const othersAvg = others.length > 0 ? others.reduce((sum, r) => sum + r.rating, 0) / others.length : null

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <StarRating value={myRating} onChange={onChange} size={size} label={ratingLabel} />
        {saving && (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-base-600 border-t-accent-400" />
        )}
        {myRating > 0 && (
          // The star row itself supports clearing too (tap/click your
          // current rating again), but that's a hidden gesture nobody would
          // guess on their own -- this is the actual, visible way to undo a
          // rating.
          <button
            type="button"
            onClick={() => onChange(0)}
            disabled={saving}
            aria-label="Clear your rating"
            className="text-xs text-base-500 underline decoration-dotted underline-offset-2 transition-colors duration-150 hover:text-base-300 disabled:opacity-50"
          >
            Clear
          </button>
        )}
        {ratings.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 text-xs text-base-400 hover:text-base-200"
          >
            {othersAvg !== null ? (
              <>
                <StarGlyph size={14} />
                {othersAvg.toFixed(1)}
                <span className="text-base-500">
                  ({others.length} {others.length === 1 ? 'other rating' : 'other ratings'})
                </span>
              </>
            ) : (
              <span className="text-base-500">{emptyLabel}</span>
            )}
          </button>
        )}
      </div>

      {open && ratings.length > 0 && (
        <motion.ul
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2.5 max-w-xs space-y-1.5 border-t border-hairline pt-2.5"
        >
          {ratings
            .slice()
            .sort((a, b) => b.rating - a.rating)
            .map((r) => (
              <li key={r.id} className="flex items-center justify-between text-xs">
                {r.user_id === currentUserId ? (
                  <span className="text-base-300">You</span>
                ) : (
                  <Link to={`/u/${r.users?.username ?? ''}`} className="text-base-300 hover:text-accent-400">
                    @{r.users?.username ?? 'unknown'}
                  </Link>
                )}
                <span className="flex items-center gap-1 text-star">
                  {r.rating.toFixed(1)}
                  <StarGlyph size={14} />
                </span>
              </li>
            ))}
        </motion.ul>
      )}
    </div>
  )
}

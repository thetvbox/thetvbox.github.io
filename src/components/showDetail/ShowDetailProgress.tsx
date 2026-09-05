import { AnimatePresence, motion } from 'framer-motion'
import DateMarkControl from '../DateMarkControl'
import RewatchLogControl from '../RewatchLogControl'
import { formatShortDate } from '../../lib/date'
import { TRIGGER_SWAP_MOTION } from '../../lib/motion'
import type { ShowRewatch } from '../../types'

interface ShowDetailProgressProps {
  watchedCount: number
  totalEpisodes: number
  onMarkAllWatched: (input: { watchedAt: string; unknownDate: boolean }) => Promise<void>
  rewatches: ShowRewatch[]
  onLogRewatch: (rewatchedAt: string) => Promise<void>
  onDeleteRewatch: (id: string) => void
}

/** Overall watch-progress bar, "mark it all watched" backfill control, and
 * the rewatch log (offered once the show is finished). */
export default function ShowDetailProgress({
  watchedCount,
  totalEpisodes,
  onMarkAllWatched,
  rewatches,
  onLogRewatch,
  onDeleteRewatch,
}: ShowDetailProgressProps) {
  const finished = watchedCount >= totalEpisodes

  return (
    <div className="mt-4 max-w-xs">
      <div className="mb-1.5 flex items-center justify-between text-xs text-base-400">
        <span>
          {watchedCount} / {totalEpisodes} episodes watched
        </span>
        {finished && <span className="text-accent-400">Finished</span>}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-800">
        <div
          className="h-full rounded-full bg-accent-500 transition-[width] duration-300"
          style={{ width: `${Math.min(100, (watchedCount / totalEpisodes) * 100)}%` }}
        />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {!finished ? (
          <motion.div key="mark-all" className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5" {...TRIGGER_SWAP_MOTION}>
            <DateMarkControl
              label="Seen this before? Mark it all watched"
              onConfirm={onMarkAllWatched}
              confirmSummary={
                watchedCount > 0
                  ? `This will overwrite the date on ${watchedCount} already-watched episode${watchedCount === 1 ? '' : 's'}.`
                  : undefined
              }
            />
          </motion.div>
        ) : (
          <motion.div key="rewatch" className="mt-2" {...TRIGGER_SWAP_MOTION}>
            <RewatchLogControl count={rewatches.length} onConfirm={onLogRewatch} />
            {rewatches.length > 0 && (
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {rewatches.map((r) => (
                  <li
                    key={r.id}
                    className="inline-flex items-center gap-1 rounded-full bg-hover-strong px-2 py-0.5 text-[11px] text-base-400"
                  >
                    {formatShortDate(r.rewatched_at)}
                    <button
                      type="button"
                      onClick={() => onDeleteRewatch(r.id)}
                      className="text-base-500 hover:text-danger"
                      aria-label="Remove this rewatch"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

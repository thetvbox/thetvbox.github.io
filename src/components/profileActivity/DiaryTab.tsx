import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { staggerRowMotion } from '../../lib/motion'
import type { DiaryEntry } from '../../lib/showActivity'
import EmptyState from '../EmptyState'
import PosterThumb from '../PosterThumb'
import StarGlyph from '../StarGlyph'

export interface DiaryDayGroup {
  heading: string
  entries: DiaryEntry[]
}

interface DiaryTabProps {
  groups: DiaryDayGroup[]
  undatedEntries: DiaryEntry[]
  username: string
}

/** Diary tab body -- day-grouped entries, plus a trailing "date unknown" bucket. */
export default function DiaryTab({ groups, undatedEntries, username }: DiaryTabProps) {
  if (groups.length === 0 && undatedEntries.length === 0) {
    return (
      <EmptyState icon="📔">
        <p className="max-w-xs text-sm text-base-500">
          Nothing logged yet. Mark an episode watched or rate a show, and it&apos;ll show up here.{' '}
          <Link to="/search" className="text-accent-400 hover:underline">
            Find a show
          </Link>{' '}
          to get started.
        </p>
      </EmptyState>
    )
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.heading + group.entries[0].id}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-500">{group.heading}</h3>
          <ul className="space-y-2">
            {group.entries.map((entry, i) => (
              <DiaryRow key={entry.id} entry={entry} index={i} username={username} />
            ))}
          </ul>
        </div>
      ))}

      {undatedEntries.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-500">Date unknown</h3>
          <ul className="space-y-2">
            {undatedEntries.map((entry, i) => (
              <DiaryRow key={entry.id} entry={entry} index={i} username={username} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/** One row in the diary -- shape (poster, name, link) is shared across all
 * three entry kinds; only the subtitle and the right-side badge differ. The
 * row's main body links to the show itself; the small icon on the end is a
 * separate link to this show's own diary (the aggregate feed here has no
 * other way to reach it) -- two siblings, not nested anchors. */
function DiaryRow({ entry, index, username }: { entry: DiaryEntry; index: number; username: string }) {
  return (
    <motion.li
      {...staggerRowMotion(index, 8)}
      className="flex items-center gap-1.5 rounded-xl border border-hairline bg-base-850/60 p-2.5 transition-colors duration-200 hover:bg-base-800/70"
    >
      <Link to={`/show/${entry.showId}`} className="flex min-w-0 flex-1 items-center gap-3">
        <PosterThumb posterPath={entry.showPosterPath} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-base-100">{entry.showName}</p>
          <p className="flex items-center gap-1 text-xs text-base-400">
            {entry.kind === 'rated' && 'Rated'}
            {entry.kind === 'rewatched' && (
              <>
                <RewatchGlyph />
                Rewatched
              </>
            )}
            {entry.kind === 'watched' && (
              <>
                <WatchedGlyph />
                {entry.episodeLabel ? (
                  <>Watched {entry.episodeLabel}</>
                ) : (
                  <>
                    Watched {entry.episodeCount} episode{entry.episodeCount === 1 ? '' : 's'}
                    {entry.seasonLabel ? ` · ${entry.seasonLabel}` : ''}
                  </>
                )}
              </>
            )}
          </p>
        </div>
        {entry.rating != null && (
          <div className="flex shrink-0 items-center gap-1 text-sm font-semibold text-star">
            {entry.rating.toFixed(1)}
            <StarGlyph />
          </div>
        )}
      </Link>
      <Link
        to={`/u/${username}/shows/${entry.showId}`}
        title="View this show's full diary"
        aria-label="View this show's full diary"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base-500 transition-colors duration-200 hover:bg-hover hover:text-accent-400"
      >
        <HistoryGlyph />
      </Link>
    </motion.li>
  )
}

function WatchedGlyph() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-accent-400)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  )
}

function RewatchGlyph() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-accent-400)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" />
      <path d="M18 4v4h-4M6 20v-4h4" />
    </svg>
  )
}

function HistoryGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 8v4l3 2" />
    </svg>
  )
}

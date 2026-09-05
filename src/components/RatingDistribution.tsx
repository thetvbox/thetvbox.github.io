import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import StarGlyph from './StarGlyph'
import PosterThumb from './PosterThumb'
import InlinePanel from './InlinePanel'
import type { ShowRating } from '../types'

const BUCKETS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const

/** Letterboxd-style rating histogram: one bar per half-star bucket (this
 * app's rating scale, see StarRating.tsx), tallest bar scaled to full
 * height so the shape of someone's ratings is visible at a glance. Clicking
 * a bar expands the exact shows behind it -- otherwise the shape is all you
 * get, with no way to see which shows landed in a given bucket. */
export default function RatingDistribution({ ratings }: { ratings: ShowRating[] }) {
  const [selected, setSelected] = useState<number | null>(null)

  const { counts, byBucket } = useMemo(() => {
    const c = new Array(BUCKETS.length).fill(0)
    const groups = new Map<number, ShowRating[]>()
    for (const r of ratings) {
      const idx = BUCKETS.indexOf(r.rating as (typeof BUCKETS)[number])
      if (idx === -1) continue
      c[idx]++
      const list = groups.get(r.rating)
      if (list) list.push(r)
      else groups.set(r.rating, [r])
    }
    return { counts: c, byBucket: groups }
  }, [ratings])

  if (ratings.length === 0) return null

  const max = Math.max(1, ...counts)
  const selectedShows = selected !== null ? (byBucket.get(selected) ?? []) : []

  return (
    <div className="mb-8">
      <div className="flex h-16 items-end gap-1">
        {BUCKETS.map((b, i) => {
          const hasShows = counts[i] > 0
          const isSelected = selected === b
          return (
            <button
              key={b}
              type="button"
              disabled={!hasShows}
              aria-pressed={isSelected}
              aria-label={`${counts[i]} show${counts[i] === 1 ? '' : 's'} rated ${b.toFixed(1)} stars${hasShows ? ' -- show list' : ''}`}
              title={`${counts[i]} show${counts[i] === 1 ? '' : 's'} rated ${b.toFixed(1)}`}
              onClick={() => setSelected((prev) => (prev === b ? null : b))}
              className={`flex-1 rounded-t-sm transition-[height,background-color] duration-300 disabled:cursor-default ${
                isSelected ? 'bg-star' : 'bg-star/70 enabled:hover:bg-star/90'
              }`}
              // A count of 0 still gets a hairline sliver -- an empty bucket
              // reads as "zero," not as a rendering gap in the bar row.
              style={{ height: `${counts[i] === 0 ? 3 : Math.max(10, (counts[i] / max) * 100)}%` }}
            />
          )
        })}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-base-500">
        <span className="flex items-center gap-1">
          <StarGlyph size={10} />
          0.5
        </span>
        <span className="flex items-center gap-1">
          <StarGlyph size={10} />
          5
        </span>
      </div>

      <AnimatePresence initial={false}>
        {selected !== null && (
          <InlinePanel key={selected} className="max-h-80 overflow-y-auto p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1 text-xs font-semibold text-base-300">
                {selected.toFixed(1)}
                <StarGlyph size={11} />
                <span className="text-base-500">
                  · {selectedShows.length} show{selectedShows.length === 1 ? '' : 's'}
                </span>
              </p>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-xs text-base-500 hover:text-base-300"
              >
                Close
              </button>
            </div>
            <ul className="space-y-1">
              {selectedShows.map((r) => (
                <li key={r.id}>
                  <Link
                    to={`/show/${r.show_id}`}
                    className="flex items-center gap-2.5 rounded-lg p-1 transition-colors duration-200 hover:bg-hover"
                  >
                    <PosterThumb posterPath={r.show_poster_path} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm text-base-200">{r.show_name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </InlinePanel>
        )}
      </AnimatePresence>
    </div>
  )
}

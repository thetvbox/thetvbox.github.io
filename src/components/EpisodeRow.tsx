import { useEffect, useRef, useState } from 'react'
import type { Ref } from 'react'
import { motion } from 'framer-motion'
import { EASE_OUT_EXPO } from '../lib/motion'
import { stillUrl } from '../lib/tmdb'
import { formatShortDate, isFutureDate } from '../lib/date'
import DateMarkControl from './DateMarkControl'
import Spinner from './Spinner'
import type { TmdbEpisode } from '../types'

interface EpisodeRowProps {
  episode: TmdbEpisode
  watched: boolean
  watchedAt: string | null
  watchedAtUnknown: boolean
  onToggleWatched: () => Promise<void>
  onMarkWatchedWithDate: (input: { watchedAt: string; unknownDate: boolean }) => Promise<void>
  rootRef?: Ref<HTMLDivElement>
  /** The next episode the viewer hasn't watched yet -- badged and highlighted so returning to a
   *  long-running show lands you on where you left off without hunting for it. */
  isUpNext?: boolean
}

export default function EpisodeRow({
  episode,
  watched,
  watchedAt,
  watchedAtUnknown,
  onToggleWatched,
  onMarkWatchedWithDate,
  rootRef,
  isUpNext = false,
}: EpisodeRowProps) {
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)
  const overviewRef = useRef<HTMLParagraphElement>(null)
  const still = stillUrl(episode.still_path)

  useEffect(() => {
    const el = overviewRef.current
    if (!el) return
    setIsTruncated(el.scrollHeight > el.clientHeight + 1)
  }, [episode.overview])
  const isUpcoming = Boolean(episode.air_date && isFutureDate(episode.air_date))

  /** Marks the episode watched as of now. */
  async function handleToggle() {
    setSaving(true)
    try {
      await onToggleWatched()
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      ref={rootRef}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
      className={`group rounded-xl border bg-base-850/60 p-3 transition-colors duration-200 hover:bg-base-800/70 sm:p-4 ${
        watched
          ? 'border-hairline ring-1 ring-inset ring-accent-500/25'
          : isUpNext
            ? 'border-accent-500/40 ring-1 ring-inset ring-accent-500/30'
            : 'border-hairline'
      } ${isUpcoming ? 'opacity-60' : ''}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-base-800 sm:w-40 sm:shrink-0">
          {still ? (
            <img
              src={still}
              srcSet={`${stillUrl(episode.still_path, 'w300')} 1x, ${stillUrl(episode.still_path, 'w780')} 2x, ${stillUrl(episode.still_path, 'w1280')} 3x`}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-base-500">
              No image
            </div>
          )}
          {episode.runtime ? (
            <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              {episode.runtime}m
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-400">
              Episode {episode.episode_number}
            </p>
            {isUpNext && (
              <span className="rounded-full bg-accent-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-300 ring-1 ring-inset ring-accent-500/30">
                Up next
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-base-100 sm:text-base">
            {episode.name || `Episode ${episode.episode_number}`}
          </p>

          <p
            ref={overviewRef}
            className={`mt-1 text-xs text-base-400 sm:text-sm ${expanded ? '' : 'line-clamp-2'}`}
          >
            {episode.overview || 'No synopsis available.'}
          </p>
          {isTruncated && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-0.5 text-xs font-medium text-accent-400 hover:underline"
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:mt-3">
            {isUpcoming ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline-strong px-3 py-1.5 text-xs font-medium text-base-500">
                Airs {formatShortDate(episode.air_date!)}
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleToggle}
                  disabled={saving}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200 disabled:opacity-60 ${
                    watched
                      ? 'border-accent-500/40 bg-accent-500/15 text-accent-300'
                      : 'border-hairline-strong text-base-400 hover:border-accent-500/40 hover:text-base-200'
                  }`}
                >
                  <CheckGlyph filled={watched} />
                  {watched
                    ? watchedAtUnknown
                      ? 'Watched a while ago'
                      : `Watched${watchedAt ? ` ${formatShortDate(watchedAt)}` : ''}`
                    : 'Mark watched'}
                  {saving && <Spinner size="xs" tone="current" className="ml-0.5" />}
                </button>
                <DateMarkControl
                  label="Watched in the past"
                  onConfirm={onMarkWatchedWithDate}
                  className={watched ? 'invisible' : ''}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function CheckGlyph({ filled }: { filled: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <circle
        cx="12"
        cy="12"
        r="10"
        fill={filled ? 'var(--color-accent-400)' : 'none'}
        stroke={filled ? 'var(--color-accent-400)' : 'currentColor'}
        strokeWidth="1.6"
      />
      {filled && (
        <path
          d="M7.5 12.5l3 3 6-6.5"
          stroke="var(--color-base-950)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}
    </svg>
  )
}

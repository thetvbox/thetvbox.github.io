import { useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import type { SeasonSegment } from '../lib/seasonProgress'
import type { TmdbSeasonSummary } from '../types'

interface SeasonTabsProps {
  seasons: TmdbSeasonSummary[]
  active: number
  onSelect: (seasonNumber: number) => void
  /** Per-season watched/total, used to badge fully-watched seasons. Omit to skip the badge. */
  segments?: SeasonSegment[]
}

export default function SeasonTabs({ seasons, active, onSelect, segments = [] }: SeasonTabsProps) {
  const real = seasons.filter((s) => s.season_number > 0 || seasons.length === 1)
  const activeRef = useRef<HTMLButtonElement>(null)
  const completedSeasons = useMemo(
    () => new Set(segments.filter((s) => s.total > 0 && s.watched >= s.total).map((s) => s.seasonNumber)),
    [segments],
  )

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
  }, [active])

  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {real.map((season) => {
        const isActive = season.season_number === active
        const isComplete = completedSeasons.has(season.season_number)
        const label = season.season_number === 0 ? 'Specials' : `Season ${season.season_number}`
        return (
          <button
            key={season.id}
            ref={isActive ? activeRef : undefined}
            type="button"
            onClick={() => onSelect(season.season_number)}
            aria-pressed={isActive}
            aria-label={isComplete ? `${label}, fully watched` : undefined}
            className="relative shrink-0 px-3.5 py-1.5 text-sm font-medium transition-colors duration-200"
          >
            {isActive && (
              <motion.span
                layoutId="season-pill"
                className="absolute inset-0 rounded-full bg-accent-500/15 ring-1 ring-accent-500/40"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className={`relative inline-flex items-center gap-1 ${isActive ? 'text-accent-300' : 'text-base-400'}`}>
              {label}
              {isComplete && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.2" />
                  <path
                    d="M7.5 12.5l3 3 6-6.5"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

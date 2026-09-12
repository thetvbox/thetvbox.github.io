import { useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { CheckGlyph } from './ShowDetailGlyphs'
import type { SeasonSegment } from '../lib/seasonProgress'
import type { TmdbSeasonSummary } from '../types'

interface SeasonTabsProps {
  seasons: TmdbSeasonSummary[]
  active: number
  onSelect: (seasonNumber: number) => void
  segments?: SeasonSegment[]
}

export default function SeasonTabs({ seasons, active, onSelect, segments = [] }: SeasonTabsProps) {
  const real = seasons.filter((s) => s.season_number > 0 || seasons.length === 1)
  const activeRef = useRef<HTMLButtonElement>(null)
  const segmentBySeasonNumber = useMemo(() => new Map(segments.map((s) => [s.seasonNumber, s])), [segments])

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
  }, [active])

  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {real.map((season) => {
        const isActive = season.season_number === active
        const segment = segmentBySeasonNumber.get(season.season_number)
        const isComplete = Boolean(segment && segment.total > 0 && segment.watched >= segment.total)
        const label = season.season_number === 0 ? 'Specials' : `Season ${season.season_number}`
        return (
          <button
            key={season.id}
            ref={isActive ? activeRef : undefined}
            type="button"
            onClick={() => onSelect(season.season_number)}
            aria-pressed={isActive}
            aria-label={isComplete ? `${label}, fully watched` : undefined}
            title={segment ? `${label} · ${segment.watched}/${segment.total} watched` : undefined}
            className="relative shrink-0 px-3.5 py-1.5 text-sm font-medium transition-colors duration-200"
          >
            {isActive && (
              <motion.span
                layoutId="season-pill"
                className="absolute inset-0 rounded-full bg-accent-500/15 ring-1 ring-accent-500/40"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className={`relative inline-flex items-center gap-1.5 ${isActive ? 'text-accent-300' : 'text-base-400'}`}>
              {label}
              {isComplete && <CheckGlyph filled size={15} />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

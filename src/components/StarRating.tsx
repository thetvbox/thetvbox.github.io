import { useId, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { motion } from 'framer-motion'

interface StarRatingProps {
  /** Rating from 0 to 5, in 0.5 increments. 0 means unrated. */
  value: number
  onChange?: (value: number) => void
  size?: 'sm' | 'md' | 'lg'
  readOnly?: boolean
  className?: string
  /** Screen-reader label for the interactive case, e.g. "Rate this show" --
   * this component has no idea what it's rating, so the caller supplies one. */
  label?: string
}

const SIZE_MAP: Record<NonNullable<StarRatingProps['size']>, number> = {
  sm: 15,
  md: 20,
  lg: 28,
}

// How far a pointer has to move before a press counts as a drag rather than
// a plain tap/click -- keeps an ordinary click from being treated as a
// (no-op, same-spot) drag.
const DRAG_THRESHOLD_PX = 6

function Star({ fill, px }: { fill: number; px: number }) {
  // fill: 0, 0.5, or 1. useId is stable and unique even with several
  // StarRating instances mounted at once (show + season ratings).
  const clipId = useId()
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" className="pointer-events-none block">
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={24 * fill} height="24" />
        </clipPath>
      </defs>
      <path
        d="M12 2.5l2.9 6.15 6.6.72-4.95 4.6 1.3 6.53L12 17.3l-5.85 3.2 1.3-6.53-4.95-4.6 6.6-.72L12 2.5z"
        fill="none"
        stroke="var(--color-base-600)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {fill > 0 && (
        <path
          d="M12 2.5l2.9 6.15 6.6.72-4.95 4.6 1.3 6.53L12 17.3l-5.85 3.2 1.3-6.53-4.95-4.6 6.6-.72L12 2.5z"
          fill="var(--color-star)"
          stroke="var(--color-star)"
          strokeWidth="1.4"
          strokeLinejoin="round"
          clipPath={`url(#${clipId})`}
        />
      )}
    </svg>
  )
}

export default function StarRating({
  value,
  onChange,
  size = 'md',
  readOnly = false,
  className = '',
  label = 'Rate this',
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // Tracks an in-progress press across the whole row (not per-star). Ref, not
  // state -- read/written within one pointer-event sequence, no re-render needed.
  const dragRef = useRef<{ pointerId: number; startX: number; dragging: boolean } | null>(null)
  const px = SIZE_MAP[size]
  const displayValue = hoverValue ?? value
  const interactive = !readOnly && Boolean(onChange)

  function valueFromClientX(clientX: number): number {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return value
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    // 5 stars, half-star steps -> 10 slots across the row's width.
    return Math.max(0.5, Math.min(5, Math.round(ratio * 10) / 2))
  }

  function handlePick(starIndex: number, half: boolean) {
    if (!interactive || !onChange) return
    const picked = half ? starIndex - 0.5 : starIndex
    // Picking the same rating again clears it -- a shortcut for the explicit
    // "Clear" control in RatingSummary.
    onChange(picked === value ? 0 : picked)
  }

  // A precise tap on a ~10px half-star zone is hard on a phone. Letting a
  // press drag across the row -- previewing live, committing on release --
  // is more forgiving. Only takes over once real movement is detected
  // (pointer capture then redirects the eventual click away from the button
  // underneath), so plain taps/clicks still go through each button's onClick.
  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!interactive) return
    dragRef.current = { pointerId: e.pointerId, startX: e.clientX, dragging: false }
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!interactive || !drag || drag.pointerId !== e.pointerId) return
    if (!drag.dragging) {
      if (Math.abs(e.clientX - drag.startX) < DRAG_THRESHOLD_PX) return
      drag.dragging = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    setHoverValue(valueFromClientX(e.clientX))
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    dragRef.current = null
    if (!interactive || !drag || drag.pointerId !== e.pointerId || !drag.dragging || !onChange) return
    const picked = valueFromClientX(e.clientX)
    onChange(picked === value ? 0 : picked)
    setHoverValue(null)
  }

  function handlePointerCancel(e: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null
    setHoverValue(null)
  }

  return (
    <div
      ref={containerRef}
      // py-2.5/-my-2.5 pads the touch target to ~44px (WCAG/HIG minimum)
      // without affecting surrounding layout. touch-pan-y keeps vertical
      // scroll gestures native so a scroll starting on the star row isn't
      // hijacked into a rating drag.
      className={`inline-flex touch-pan-y items-center gap-[3px] py-2.5 -my-2.5 ${className}`}
      onMouseLeave={() => {
        if (!dragRef.current?.dragging) setHoverValue(null)
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      role={interactive ? 'radiogroup' : undefined}
      aria-label={interactive ? label : `Rated ${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((starIndex) => {
        const fillForStar = Math.max(0, Math.min(1, displayValue - (starIndex - 1)))
        return (
          <motion.div
            key={starIndex}
            className="relative"
            whileHover={interactive ? { scale: 1.18 } : undefined}
            whileTap={interactive ? { scale: 0.92 } : undefined}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          >
            <Star fill={fillForStar} px={px} />
            {interactive && (
              <span className="absolute inset-0 flex">
                <button
                  type="button"
                  aria-label={`${starIndex - 0.5} stars`}
                  className="h-full w-1/2 cursor-pointer"
                  onMouseEnter={() => setHoverValue(starIndex - 0.5)}
                  onFocus={() => setHoverValue(starIndex - 0.5)}
                  onClick={() => handlePick(starIndex, true)}
                />
                <button
                  type="button"
                  aria-label={`${starIndex} stars`}
                  className="h-full w-1/2 cursor-pointer"
                  onMouseEnter={() => setHoverValue(starIndex)}
                  onFocus={() => setHoverValue(starIndex)}
                  onClick={() => handlePick(starIndex, false)}
                />
              </span>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

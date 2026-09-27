import type { ReactNode } from 'react'
import HapticOverlay from './HapticOverlay'

/** Shared sizing/color for every pill-shaped filter/select control app-wide (chips, filter triggers, segmented options). */
export const PILL_SIZE_CLASSES = 'rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200'
export const PILL_ACTIVE_CLASSES = 'bg-accent-500/15 text-accent-300 ring-1 ring-accent-500/40'
export const PILL_INACTIVE_CLASSES = 'bg-base-850/60 text-base-400 ring-1 ring-hairline hover:text-base-200'

/** A small toggleable pill, shared by every chip-style filter/select control in the app. `disabled` dims it and blocks new selection (e.g. a facet value that would currently match nothing) without hiding it -- an already-active chip should stay clickable so it can still be cleared. */
export default function Chip({
  active,
  onClick,
  disabled = false,
  children,
}: {
  active: boolean
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`relative shrink-0 ${PILL_SIZE_CLASSES} ${active ? PILL_ACTIVE_CLASSES : PILL_INACTIVE_CLASSES} ${disabled ? 'opacity-40' : ''}`}
    >
      <HapticOverlay />
      {children}
    </button>
  )
}

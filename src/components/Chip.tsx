import type { ReactNode } from 'react'
import HapticOverlay from './HapticOverlay'

/** Shared sizing for every pill-shaped filter/select control in the app (chips, filter
 * triggers, segmented options) -- kept in one place so bumping the scale reads as
 * consistent everywhere rather than as a pile of per-component tweaks. */
export const PILL_SIZE_CLASSES = 'rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200'
export const PILL_ACTIVE_CLASSES = 'bg-accent-500/15 text-accent-300 ring-1 ring-accent-500/40'
export const PILL_INACTIVE_CLASSES = 'bg-base-850/60 text-base-400 ring-1 ring-hairline hover:text-base-200'

/** A small toggleable pill, shared by every chip-style filter/select control in the app. */
export default function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative shrink-0 ${PILL_SIZE_CLASSES} ${active ? PILL_ACTIVE_CLASSES : PILL_INACTIVE_CLASSES}`}
    >
      <HapticOverlay />
      {children}
    </button>
  )
}

import type { ReactNode } from 'react'
import HapticOverlay from './HapticOverlay'

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
      className={`relative shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-200 ${
        active
          ? 'bg-accent-500/15 text-accent-300 ring-1 ring-accent-500/40'
          : 'bg-base-850/60 text-base-400 ring-1 ring-hairline hover:text-base-200'
      }`}
    >
      <HapticOverlay />
      {children}
    </button>
  )
}

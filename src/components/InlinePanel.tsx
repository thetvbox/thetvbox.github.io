import { useRef } from 'react'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { INLINE_PANEL_ANIMATE, INLINE_PANEL_EXIT, INLINE_PANEL_INITIAL, INLINE_PANEL_TRANSITION } from '../lib/motion'

/** Shared shell for this app's conditionally-mounted inline panels (content-filter forms and
 *  similar expanding panels that push the content below them down, as opposed to DropdownPanel's
 *  floating menus). Animated open/closed, and traps focus while mounted -- it's only ever
 *  rendered while its panel is meant to be open, so that's always true here. `label` sets the
 *  panel's accessible name for screen readers; omit it for a panel that doesn't read as its own
 *  dialog (rare). */
export default function InlinePanel({
  className = '',
  label,
  children,
}: {
  className?: string
  label?: string
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(true, panelRef)

  return (
    <motion.div
      ref={panelRef}
      layout
      initial={INLINE_PANEL_INITIAL}
      animate={INLINE_PANEL_ANIMATE}
      exit={INLINE_PANEL_EXIT}
      transition={INLINE_PANEL_TRANSITION}
      role={label ? 'dialog' : undefined}
      aria-label={label}
      className={`mt-2 rounded-2xl border border-hairline-strong bg-base-900 shadow-xl shadow-black/30 ${className}`}
    >
      {children}
    </motion.div>
  )
}

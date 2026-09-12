import { useRef } from 'react'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { INLINE_PANEL_ANIMATE, INLINE_PANEL_EXIT, INLINE_PANEL_INITIAL, INLINE_PANEL_TRANSITION } from '../lib/motion'

/** Shared shell for this app's inline (push-content-down) panels, animated open/closed with focus trapped while mounted. */
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

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { INLINE_PANEL_ANIMATE, INLINE_PANEL_EXIT, INLINE_PANEL_INITIAL, INLINE_PANEL_TRANSITION } from '../lib/motion'

/** Shared shell for this app's conditionally-mounted inline panels, animated open/closed. */
export default function InlinePanel({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <motion.div
      layout
      initial={INLINE_PANEL_INITIAL}
      animate={INLINE_PANEL_ANIMATE}
      exit={INLINE_PANEL_EXIT}
      transition={INLINE_PANEL_TRANSITION}
      className={`mt-2 rounded-2xl border border-hairline-strong bg-base-900 shadow-lg shadow-black/20 ${className}`}
    >
      {children}
    </motion.div>
  )
}

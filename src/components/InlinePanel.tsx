import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { INLINE_PANEL_ANIMATE, INLINE_PANEL_EXIT, INLINE_PANEL_INITIAL, INLINE_PANEL_TRANSITION } from '../lib/motion'

/** Shared shell for this app's conditionally-mounted inline panels (no true
 * modals -- see useEscapeAndFocusReturn): ChangelogPanel, ProviderPicker,
 * AddToListPicker, HistoryFiltersPanel, FollowListPanel. Animates open/closed
 * with the shared INLINE_PANEL_* motion -- the caller only needs to wrap its
 * conditional render in <AnimatePresence> for the exit to play. */
export default function InlinePanel({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <motion.div
      layout
      initial={INLINE_PANEL_INITIAL}
      animate={INLINE_PANEL_ANIMATE}
      exit={INLINE_PANEL_EXIT}
      transition={INLINE_PANEL_TRANSITION}
      className={`mt-2 rounded-xl border border-hairline-strong bg-base-900 ${className}`}
    >
      {children}
    </motion.div>
  )
}

import { useRef } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useEscapeAndFocusReturn } from '../hooks/useEscapeAndFocusReturn'
import { useFocusTrap } from '../hooks/useFocusTrap'
import {
  DROPDOWN_PANEL_ANIMATE,
  DROPDOWN_PANEL_EXIT,
  DROPDOWN_PANEL_INITIAL,
  DROPDOWN_PANEL_TRANSITION,
} from '../lib/motion'

interface DropdownPanelProps {
  onClose: () => void
  label: string
  /** 'right' (default) anchors the panel's right edge to its trigger's right edge -- correct
   *  for a trigger that sits at (or near) the right edge of the page/its row, like the
   *  notifications bell, where a centered panel could overflow off-screen. 'center' centers the
   *  panel under the trigger instead, for a trigger that sits away from any edge. Both are
   *  transform-free (auto margins / inset, not translate) so they don't fight framer-motion's
   *  own transform-based scale/y animation. */
  align?: 'right' | 'center'
  className?: string
  children: ReactNode
}

const ALIGN_CLASSES = {
  right: 'right-0 origin-top-right',
  center: 'inset-x-0 mx-auto origin-top',
} as const

/** Shared shell for this app's floating dropdowns (notifications, person filter, profile menu,
 *  and any future short picklist/menu) -- anchors to a `relative` ancestor, floats over the page
 *  instead of pushing content down like InlinePanel, and owns escape-to-close, focus trap, and
 *  focus-return on close so each consumer doesn't have to wire that up itself. */
export default function DropdownPanel({ onClose, label, align = 'right', className = '', children }: DropdownPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  useEscapeAndFocusReturn(true, onClose)
  useFocusTrap(true, panelRef)

  return (
    <motion.div
      ref={panelRef}
      layout
      initial={DROPDOWN_PANEL_INITIAL}
      animate={DROPDOWN_PANEL_ANIMATE}
      exit={DROPDOWN_PANEL_EXIT}
      transition={DROPDOWN_PANEL_TRANSITION}
      role="dialog"
      aria-label={label}
      className={`absolute top-full z-50 mt-2 max-w-[calc(100vw-2rem)] rounded-2xl border border-hairline-strong bg-base-900/95 shadow-2xl shadow-black/40 backdrop-blur-xl ${ALIGN_CLASSES[align]} ${className}`}
    >
      {children}
    </motion.div>
  )
}

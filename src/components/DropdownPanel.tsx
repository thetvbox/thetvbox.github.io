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
  className?: string
  children: ReactNode
}

/** Shared shell for this app's floating dropdowns, with escape-to-close, focus trap, and focus-return built in. */
export default function DropdownPanel({ onClose, label, className = '', children }: DropdownPanelProps) {
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
      className={`absolute right-0 top-full z-50 mt-2 max-w-[calc(100vw-2rem)] origin-top-right rounded-2xl border border-hairline-strong bg-base-900/95 shadow-2xl shadow-black/40 backdrop-blur-xl ${className}`}
    >
      {children}
    </motion.div>
  )
}

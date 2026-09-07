import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useEscapeAndFocusReturn } from '../hooks/useEscapeAndFocusReturn'
import {
  MODAL_BACKDROP_ANIMATE,
  MODAL_BACKDROP_EXIT,
  MODAL_BACKDROP_INITIAL,
  MODAL_BACKDROP_TRANSITION,
  MODAL_PANEL_ANIMATE,
  MODAL_PANEL_EXIT,
  MODAL_PANEL_INITIAL,
  MODAL_PANEL_TRANSITION,
} from '../lib/motion'

interface ModalProps {
  onClose: () => void
  label: string
  children: ReactNode
  /** Tailwind max-width class for the panel. Defaults to a compact form width. */
  maxWidth?: string
  className?: string
}

/**
 * App-wide centered overlay: portals to document.body, dims the page behind a blurred backdrop,
 * and never reflows page content -- unlike an in-flow panel, opening or closing one can't shift
 * anything above or below it. Handles escape-to-close, focus return, and body-scroll lock.
 */
export default function Modal({ onClose, label, children, maxWidth = 'max-w-md', className = '' }: ModalProps) {
  useEscapeAndFocusReturn(true, onClose)

  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={MODAL_BACKDROP_INITIAL}
        animate={MODAL_BACKDROP_ANIMATE}
        exit={MODAL_BACKDROP_EXIT}
        transition={MODAL_BACKDROP_TRANSITION}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        initial={MODAL_PANEL_INITIAL}
        animate={MODAL_PANEL_ANIMATE}
        exit={MODAL_PANEL_EXIT}
        transition={MODAL_PANEL_TRANSITION}
        className={`relative z-10 w-full ${maxWidth} rounded-2xl border border-hairline-strong bg-base-900 shadow-2xl shadow-black/40 ${className}`}
      >
        {children}
      </motion.div>
    </div>,
    document.body,
  )
}

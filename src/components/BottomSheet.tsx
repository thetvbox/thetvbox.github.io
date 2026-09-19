import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { useEscapeAndFocusReturn } from '../hooks/useEscapeAndFocusReturn'
import { useFocusTrap } from '../hooks/useFocusTrap'
import {
  GLASS_SPRING,
  MODAL_BACKDROP_ANIMATE,
  MODAL_BACKDROP_EXIT,
  MODAL_BACKDROP_INITIAL,
  MODAL_BACKDROP_TRANSITION,
  shouldCloseFromDrag,
} from '../lib/motion'

interface BottomSheetProps {
  onClose: () => void
  label: string
  children: ReactNode
  className?: string
}

/** App-wide bottom sheet -- swipe-to-dismiss, glass surface, escape-to-close, focus trap+return, and scroll lock. */
export default function BottomSheet({ onClose, label, children, className = '' }: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  useEscapeAndFocusReturn(true, onClose)
  useFocusTrap(true, panelRef)

  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [])

  /** Closes the sheet once a downward drag passes the distance or velocity threshold. */
  function handleDragEnd(_event: unknown, info: PanInfo) {
    if (shouldCloseFromDrag(info.offset.y, info.velocity.y)) onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
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
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={handleDragEnd}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={GLASS_SPRING}
        className={`glass-surface-strong relative z-10 w-full max-w-lg rounded-t-3xl border-t border-hairline-strong pb-[env(safe-area-inset-bottom)] shadow-2xl shadow-black/40 sm:rounded-3xl sm:border ${className}`}
      >
        <div className="flex justify-center pb-1 pt-2.5" aria-hidden="true">
          <div className="h-1.5 w-9 rounded-full bg-base-600" />
        </div>
        {children}
      </motion.div>
    </div>,
    document.body,
  )
}

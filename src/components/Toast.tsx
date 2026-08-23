import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { TOAST_SECONDS } from '../lib/constants'
import { EASE_OUT_EXPO } from '../lib/motion'
import type { ToastState } from '../hooks/useToast'

export interface ToastAction {
  label: string
  onClick: () => void
}

/** Shared toast for "Undo" offers and failed-write errors -- every mutating
 * action in the app funnels through this via the useToast hook. Owns its own
 * AnimatePresence/key so callers just render it unconditionally; keying by
 * message also gives each new toast (even one replacing a still-visible one)
 * its own fresh auto-dismiss timer instead of inheriting a stale one. */
export default function Toast({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.message}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
          className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 md:bottom-6"
        >
          <ToastBody toast={toast} onDismiss={onDismiss} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ToastBody({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, TOAST_SECONDS * 1000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remounts per toast.message (see the key above), so this only ever needs to run once per toast
  }, [])

  return (
    <div
      className={`flex items-center gap-3 rounded-full border px-4 py-2.5 shadow-2xl shadow-black/40 ${
        toast.tone === 'error' ? 'border-danger/40 bg-base-850' : 'border-hairline-strong bg-base-850'
      }`}
    >
      {toast.tone === 'error' && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />}
      <p className="text-xs text-base-200">{toast.message}</p>
      {toast.action && (
        <button
          type="button"
          onClick={toast.action.onClick}
          className="shrink-0 text-xs font-semibold text-accent-400 hover:underline"
        >
          {toast.action.label}
        </button>
      )}
    </div>
  )
}

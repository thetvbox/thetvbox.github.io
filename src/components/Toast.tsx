import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { TOAST_SECONDS } from '../lib/constants'

export interface ToastAction {
  label: string
  onClick: () => void
}

/** Shared toast for "Undo" offers and failed-write errors -- every mutating
 * action in the app funnels through this via the useToast hook. */
export default function Toast({
  message,
  tone = 'info',
  action,
  onDismiss,
  seconds = TOAST_SECONDS,
}: {
  message: string
  tone?: 'info' | 'error'
  action?: ToastAction
  onDismiss: () => void
  seconds?: number
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, seconds * 1000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 md:bottom-6"
    >
      <div
        className={`flex items-center gap-3 rounded-full border px-4 py-2.5 shadow-2xl shadow-black/40 ${
          tone === 'error' ? 'border-danger/40 bg-base-850' : 'border-hairline-strong bg-base-850'
        }`}
      >
        {tone === 'error' && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />}
        <p className="text-xs text-base-200">{message}</p>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="shrink-0 text-xs font-semibold text-accent-400 hover:underline"
          >
            {action.label}
          </button>
        )}
      </div>
    </motion.div>
  )
}

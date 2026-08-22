import { useCallback, useState } from 'react'
import type { ToastAction } from '../components/Toast'

export interface ToastState {
  message: string
  tone: 'info' | 'error'
  action?: ToastAction
}

/** One toast slot per page, shared by every mutating action -- a new toast
 * replaces the last un-actioned one rather than stacking. `onUndo` should
 * handle its own errors via showError; this hook doesn't guess at those. */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)

  const showUndo = useCallback((message: string, onUndo: () => void) => {
    setToast({
      message,
      tone: 'info',
      action: {
        label: 'Undo',
        onClick: () => {
          setToast(null)
          onUndo()
        },
      },
    })
  }, [])

  const showError = useCallback((message: string) => {
    setToast({ message, tone: 'error' })
  }, [])

  const dismiss = useCallback(() => setToast(null), [])

  return { toast, showUndo, showError, dismiss }
}

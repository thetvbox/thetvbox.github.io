import { useCallback, useState } from 'react'
import type { ToastAction } from '../components/Toast'

export interface ToastState {
  id: number
  message: string
  tone: 'info' | 'error'
  action?: ToastAction
}

let nextToastId = 0

/** One toast slot per page; a new toast replaces the last un-actioned one rather than stacking. */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)

  const showUndo = useCallback((message: string, onUndo: () => void) => {
    setToast({
      id: ++nextToastId,
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
    setToast({ id: ++nextToastId, message, tone: 'error' })
  }, [])

  const showInfo = useCallback((message: string) => {
    setToast({ id: ++nextToastId, message, tone: 'info' })
  }, [])

  const dismiss = useCallback(() => setToast(null), [])

  return { toast, showUndo, showError, showInfo, dismiss }
}

import { useEffect, useRef } from 'react'

/** Escape-to-close and focus-return-to-trigger for this app's inline toggled
 * panels (no true modals anywhere). Captures whatever had focus when the
 * panel opened and restores it on close, however that close happened. */
export function useEscapeAndFocusReturn(active: boolean, onClose: () => void) {
  const triggerRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!active) return
    triggerRef.current = document.activeElement as HTMLElement | null

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      triggerRef.current?.focus?.()
    }
  }, [active])
}

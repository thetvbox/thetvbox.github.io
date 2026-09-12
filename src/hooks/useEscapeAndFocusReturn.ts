import { useEffect, useLayoutEffect, useRef } from 'react'

/** Escape-to-close and focus-return-to-trigger for this app's toggled panels and modal. */
export function useEscapeAndFocusReturn(active: boolean, onClose: () => void) {
  const triggerRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  // Keep the ref current via a layout effect (not a render-body assignment) -- it still runs
  // before the keydown listener below can ever fire, since layout effects commit before
  // regular effects in the same pass.
  useLayoutEffect(() => {
    onCloseRef.current = onClose
  })

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

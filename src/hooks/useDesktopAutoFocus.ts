import { useEffect, useRef } from 'react'

/** Focuses the input on `active`, desktop (fine pointer) only. */
export function useDesktopAutoFocus(active: boolean) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!active) return
    if (typeof window === 'undefined' || !window.matchMedia) return
    if (window.matchMedia('(pointer: fine)').matches) {
      ref.current?.focus()
    }
  }, [active])
  return ref
}

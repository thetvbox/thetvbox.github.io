import { useEffect, useLayoutEffect, useRef } from 'react'

/** Closes a panel/dropdown on a pointer-down outside its returned ref'd element. */
export function useOutsideClick<T extends HTMLElement>(active: boolean, onOutside: () => void) {
  const ref = useRef<T>(null)
  const onOutsideRef = useRef(onOutside)
  useLayoutEffect(() => {
    onOutsideRef.current = onOutside
  })

  useEffect(() => {
    if (!active) return
    function handlePointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutsideRef.current()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [active])

  return ref
}

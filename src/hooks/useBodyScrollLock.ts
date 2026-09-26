import { useEffect } from 'react'

let lockCount = 0
let previousOverflow = ''

/** Locks body scroll for as long as this component is mounted, ref-counted so stacked overlays (a Modal opened from within a BottomSheet, say) don't unlock the page early when only one of them closes. */
export function useBodyScrollLock(): void {
  useEffect(() => {
    if (lockCount === 0) {
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    lockCount++
    return () => {
      lockCount--
      if (lockCount === 0) {
        document.body.style.overflow = previousOverflow
      }
    }
  }, [])
}

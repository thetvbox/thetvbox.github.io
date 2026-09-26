import { useEffect, useRef } from 'react'

/** Fires iOS Safari's native checkbox-switch Taptic haptic on a real tap; an invisible, harmless no-op elsewhere -- `touch-manipulation` keeps the switch's own drag-to-toggle gesture from swallowing scroll swipes inside a horizontally-scrolling tab strip. */
export default function HapticOverlay() {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.setAttribute('switch', '')
  }, [])

  return (
    <input
      ref={ref}
      type="checkbox"
      aria-hidden="true"
      tabIndex={-1}
      className="absolute inset-0 z-10 m-0 h-full w-full cursor-pointer touch-manipulation appearance-none opacity-0"
    />
  )
}

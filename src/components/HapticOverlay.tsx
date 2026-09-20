import { useEffect, useRef } from 'react'

/**
 * Fires iOS Safari 17.4+'s native Taptic Engine "toggle" haptic when tapped, via the
 * `<input type="checkbox" switch>` trick -- a safe, invisible no-op everywhere else.
 *
 * Must render as a DIRECT CHILD of the actual interactive element (a `position: relative`
 * button, link, etc.), sized to cover it completely and WITHOUT `pointer-events: none`, so the
 * user's real tap physically lands on this switch first -- which is what makes Safari fire a
 * genuine haptic -- before the click event bubbles up to the parent's own onClick exactly as
 * if the overlay weren't there. A hidden 1x1px singleton toggled via a programmatic `.click()`
 * (this app's previous approach) does NOT work: Safari only fires the haptic for a real,
 * physically-landed tap on the switch itself, not a synthetic one.
 *
 * Deliberately left uncontrolled (no `checked`/`onChange`) so the browser's own native toggle
 * animation -- the thing that actually triggers the haptic -- is never fought or reset by React;
 * its resulting checked state is never read, so that's safe.
 */
export default function HapticOverlay() {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // The `switch` attribute isn't in the DOM typings yet (Safari-only, 17.4+); set it directly.
    ref.current?.setAttribute('switch', '')
  }, [])

  return (
    <input
      ref={ref}
      type="checkbox"
      aria-hidden="true"
      tabIndex={-1}
      className="absolute inset-0 z-10 m-0 h-full w-full cursor-pointer appearance-none opacity-0"
    />
  )
}

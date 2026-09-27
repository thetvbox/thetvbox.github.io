import type { CSSProperties } from 'react'

/** Style that skips layout/paint work for an off-screen list row or grid tile until it's scrolled near, using `size` as the initial placeholder before the browser remembers the real one. */
export function offscreenSkipStyle(size: number): CSSProperties {
  return {
    contentVisibility: 'auto',
    containIntrinsicSize: `auto ${size}px`,
  } as CSSProperties
}

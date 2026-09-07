/** True if the OS-level "reduce motion" setting is on. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** Returns 'smooth' unless reduced motion is requested, for direct scrollTo calls. */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth'
}

export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const

export const DROPDOWN_PANEL_INITIAL = { opacity: 0, scale: 0.95, y: -8 } as const
export const DROPDOWN_PANEL_ANIMATE = { opacity: 1, scale: 1, y: 0 } as const
export const DROPDOWN_PANEL_EXIT = {
  opacity: 0,
  scale: 0.97,
  y: -4,
  transition: { duration: 0.12, ease: EASE_OUT_EXPO },
} as const
export const DROPDOWN_PANEL_TRANSITION = {
  opacity: { duration: 0.18, ease: EASE_OUT_EXPO },
  scale: { duration: 0.18, ease: EASE_OUT_EXPO },
  y: { duration: 0.18, ease: EASE_OUT_EXPO },
  layout: { duration: 0.22, ease: EASE_OUT_EXPO },
} as const

export const MODAL_BACKDROP_INITIAL = { opacity: 0 } as const
export const MODAL_BACKDROP_ANIMATE = { opacity: 1 } as const
export const MODAL_BACKDROP_EXIT = { opacity: 0, transition: { duration: 0.15, ease: EASE_OUT_EXPO } } as const
export const MODAL_BACKDROP_TRANSITION = { duration: 0.2, ease: EASE_OUT_EXPO } as const

export const MODAL_PANEL_INITIAL = { opacity: 0, scale: 0.95, y: 12 } as const
export const MODAL_PANEL_ANIMATE = { opacity: 1, scale: 1, y: 0 } as const
export const MODAL_PANEL_EXIT = {
  opacity: 0,
  scale: 0.96,
  y: 8,
  transition: { duration: 0.15, ease: EASE_OUT_EXPO },
} as const
export const MODAL_PANEL_TRANSITION = { duration: 0.22, ease: EASE_OUT_EXPO } as const

export const INLINE_PANEL_INITIAL = { opacity: 0, y: -6 } as const
export const INLINE_PANEL_ANIMATE = { opacity: 1, y: 0 } as const
export const INLINE_PANEL_EXIT = {
  opacity: 0,
  y: -4,
  transition: { duration: 0.12, ease: EASE_OUT_EXPO },
} as const
export const INLINE_PANEL_TRANSITION = {
  opacity: { duration: 0.2, ease: EASE_OUT_EXPO },
  y: { duration: 0.2, ease: EASE_OUT_EXPO },
  layout: { duration: 0.22, ease: EASE_OUT_EXPO },
} as const

export const TRIGGER_SWAP_MOTION = {
  initial: { opacity: 0, y: -4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4 },
  transition: { duration: 0.15, ease: EASE_OUT_EXPO },
} as const

/** Cross-fade between routes. Opacity-only so it stays smooth under reduced-motion. */
export const ROUTE_TRANSITION_MOTION = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15, ease: EASE_OUT_EXPO },
} as const

const STAGGER_STEP_SECONDS = 0.02
const STAGGER_ROW_DURATION = 0.25

/** Returns the per-item entrance delay for a staggered list/grid, capped for long lists. */
export function staggerDelay(index: number, cap = 10): number {
  return Math.min(index, cap) * STAGGER_STEP_SECONDS
}

export const PAGE_HEADER_MOTION = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: EASE_OUT_EXPO },
} as const

/** Returns per-row entrance motion for a staggered list item. */
export function staggerRowMotion(index: number, cap = 10) {
  return {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: STAGGER_ROW_DURATION, delay: staggerDelay(index, cap), ease: EASE_OUT_EXPO },
  } as const
}

const STAGGER_TILE_DURATION = 0.3

/** Same idea as staggerRowMotion, for a poster grid tile. */
export function staggerTileMotion(index: number, cap = 12) {
  return {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: STAGGER_TILE_DURATION, delay: staggerDelay(index, cap), ease: EASE_OUT_EXPO },
  } as const
}

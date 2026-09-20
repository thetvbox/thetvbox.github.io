/** True if the OS-level "reduce motion" setting is on. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
}

/** Returns 'smooth' unless reduced motion is requested, for direct scrollTo calls. */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth'
}

export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const

/** Spring feel matching UIKit/SwiftUI's default interactive spring -- for glass-panel morphs and drag gestures. */
export const GLASS_SPRING = { type: 'spring', stiffness: 380, damping: 32, mass: 0.9 } as const

/** A snappier spring for small, immediate feedback (a toggle, a tap) rather than a panel-sized transition. */
export const GLASS_SPRING_SNAPPY = { type: 'spring', stiffness: 520, damping: 30, mass: 0.7 } as const

const DRAG_CLOSE_THRESHOLD_PX = 80
const DRAG_CLOSE_VELOCITY = 500

/** True if a downward drag-to-dismiss gesture passed the distance or velocity threshold to close a sheet. */
export function shouldCloseFromDrag(offsetY: number, velocityY: number): boolean {
  return offsetY > DRAG_CLOSE_THRESHOLD_PX || velocityY > DRAG_CLOSE_VELOCITY
}

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
export const MODAL_PANEL_TRANSITION = {
  opacity: { duration: 0.22, ease: EASE_OUT_EXPO },
  scale: { duration: 0.22, ease: EASE_OUT_EXPO },
  y: { duration: 0.22, ease: EASE_OUT_EXPO },
  layout: { duration: 0.22, ease: EASE_OUT_EXPO },
} as const

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

export const ROUTE_TRANSITION_MOTION = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15, ease: EASE_OUT_EXPO },
} as const

/** Fade+slide-up entrance for a centered auth/gate card (Login, PasscodeGate). */
export const CARD_ENTRANCE_MOTION = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: EASE_OUT_EXPO },
} as const

/** Fade+horizontal-slide swap between wizard-style steps (Login's email/username/signin/bootstrap). */
export const STEP_SWAP_MOTION = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -12 },
  transition: { duration: 0.25, ease: EASE_OUT_EXPO },
} as const

/** Fade+slide entrance/exit for the toast stack. */
export const TOAST_MOTION = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: { duration: 0.25, ease: EASE_OUT_EXPO },
} as const

export const HERO_META_TRANSITION = { duration: 0.4, ease: EASE_OUT_EXPO } as const
export const ICON_SWAP_TRANSITION = { duration: 0.25, ease: EASE_OUT_EXPO } as const
export const NAV_FADE_IN_TRANSITION = { duration: 0.3, ease: EASE_OUT_EXPO } as const
export const MOBILE_TAB_INDICATOR_SPRING = { type: 'spring', stiffness: 500, damping: 32 } as const
export const SEASON_TAB_INDICATOR_SPRING = { type: 'spring', stiffness: 400, damping: 32 } as const
export const STAR_TAP_SPRING = { type: 'spring', stiffness: 500, damping: 20 } as const

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

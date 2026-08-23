/** Whether the OS-level "reduce motion" setting is on. MotionConfig (see
 * App.tsx) covers framer-motion automatically; only needed for native APIs
 * like scrollTo that don't know about that setting. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** 'smooth' unless reduced motion is requested, for direct scrollTo calls. */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth'
}

/** The app's one entrance/exit easing curve, shared by every panel, card,
 * and hero transition instead of being repeated as a raw array. */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const

/** Shared open/close motion for the inline top-bar dropdown panels
 * (NotificationsBell, ReportBugButton). `layout` is included so a panel
 * whose content changes height after mounting -- a loading skeleton
 * resolving to real content, a form swapping to a success message -- resizes
 * smoothly instead of snapping to the new height. */
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

const STAGGER_STEP_SECONDS = 0.02

/** Per-item entrance delay for a staggered list/grid, capped so a long list
 * doesn't take ages to finish animating in. */
export function staggerDelay(index: number, cap = 10): number {
  return Math.min(index, cap) * STAGGER_STEP_SECONDS
}

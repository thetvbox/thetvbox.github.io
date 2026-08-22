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

const STAGGER_STEP_SECONDS = 0.02

/** Per-item entrance delay for a staggered list/grid, capped so a long list
 * doesn't take ages to finish animating in. */
export function staggerDelay(index: number, cap = 10): number {
  return Math.min(index, cap) * STAGGER_STEP_SECONDS
}

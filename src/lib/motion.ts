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

/** Shared open/close motion for the inline top-bar dropdown panel
 * (NotificationsBell). `layout` is included so a panel whose content changes
 * height after mounting -- a loading skeleton resolving to real content --
 * resizes smoothly instead of snapping to the new height. */
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

/** Backdrop + panel motion for this app's one true centered modal
 * (ReportBugButton) -- unlike the dropdown/inline panel presets above, which
 * pop out from a specific trigger corner, a centered dialog has no
 * meaningful "origin," so it just fades the backdrop in behind a panel that
 * scales and rises slightly into place. */
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

/** Shared open/close motion for this app's inline panels (no true modals --
 * see InlinePanel.tsx, used by ChangelogPanel, ProviderPicker,
 * AddToListPicker, HistoryFiltersPanel, FollowListPanel). A softer fade+rise
 * than DROPDOWN_PANEL_*'s scale -- these expand in the page's normal flow
 * rather than popping out from a small corner trigger, so a scale read as
 * springing from the wrong place. */
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

/** Crossfade for a text trigger swapping to its expanded form and back
 * (DateMarkControl, RewatchLogControl) -- spread onto the motion.div wrapping
 * each branch, keyed so AnimatePresence treats them as distinct: `<motion.div
 * key="trigger" {...TRIGGER_SWAP_MOTION}>`. Replaces an instant DOM swap that
 * read as an abrupt pop instead of one control opening. */
export const TRIGGER_SWAP_MOTION = {
  initial: { opacity: 0, y: -4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4 },
  transition: { duration: 0.15, ease: EASE_OUT_EXPO },
} as const

const STAGGER_STEP_SECONDS = 0.02
const STAGGER_ROW_DURATION = 0.25

/** Per-item entrance delay for a staggered list/grid, capped so a long list
 * doesn't take ages to finish animating in. */
export function staggerDelay(index: number, cap = 10): number {
  return Math.min(index, cap) * STAGGER_STEP_SECONDS
}

/** Every page's `<h1>`/header block fades and rises in the same way --
 * spread directly onto the motion element: `<motion.div {...PAGE_HEADER_MOTION}>`. */
export const PAGE_HEADER_MOTION = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: EASE_OUT_EXPO },
} as const

/** Per-row entrance for a staggered list -- spread directly:
 * `<motion.li {...staggerRowMotion(i)}>`. `cap` matches staggerDelay's. */
export function staggerRowMotion(index: number, cap = 10) {
  return {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: STAGGER_ROW_DURATION, delay: staggerDelay(index, cap), ease: EASE_OUT_EXPO },
  } as const
}

const STAGGER_TILE_DURATION = 0.3

/** Same idea as staggerRowMotion, for a poster grid tile -- a bigger element
 * gets a slightly larger rise and duration. */
export function staggerTileMotion(index: number, cap = 12) {
  return {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: STAGGER_TILE_DURATION, delay: staggerDelay(index, cap), ease: EASE_OUT_EXPO },
  } as const
}

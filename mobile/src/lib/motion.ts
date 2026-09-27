import { AccessibilityInfo } from 'react-native';

let reduceMotionEnabled = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then((enabled) => {
    reduceMotionEnabled = enabled;
  })
  .catch(() => {});
AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
  reduceMotionEnabled = enabled;
});

/* Only the framework-agnostic parts of web's src/lib/motion.ts port here. The rest of that
   file is framer-motion prop shapes (initial/animate/exit/transition), which don't apply to
   react-native-reanimated's worklet-based API -- each ported screen recreates the same
   spring/easing feel directly with Reanimated as it's built, rather than reusing these
   constants. */

/** True if the OS-level "reduce motion" setting is on, per the last AccessibilityInfo read. */
export function prefersReducedMotion(): boolean {
  return reduceMotionEnabled;
}

export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const DRAG_CLOSE_THRESHOLD_PX = 80;
const DRAG_CLOSE_VELOCITY = 500;

/** True if a downward drag-to-dismiss gesture passed the distance or velocity threshold to close a sheet. */
export function shouldCloseFromDrag(offsetY: number, velocityY: number): boolean {
  return offsetY > DRAG_CLOSE_THRESHOLD_PX || velocityY > DRAG_CLOSE_VELOCITY;
}

const STAGGER_STEP_SECONDS = 0.02;

/** Returns the per-item entrance delay (seconds) for a staggered list/grid, capped for long lists. */
export function staggerDelay(index: number, cap = 10): number {
  return Math.min(index, cap) * STAGGER_STEP_SECONDS;
}

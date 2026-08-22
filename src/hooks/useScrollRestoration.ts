import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { scrollBehavior } from '../lib/motion'

const STORAGE_PREFIX = 'scrollpos:'

// Retry budget for restoring scroll while an async page is still growing
// (~1s at 60fps) -- see tryRestore below.
const RESTORE_ATTEMPTS = 60

/** Restores scroll position on back/forward (POP), resets to top on any
 * other navigation. Keyed by location.key (unique per history entry) so
 * revisiting the same route doesn't collide. Call once at the app shell. */
export function useScrollRestoration() {
  const location = useLocation()
  const navType = useNavigationType()

  useEffect(() => {
    if (navType !== 'POP') {
      // Animated glide for the common "tapped a nav item" case -- the POP
      // restore below stays instant since it retries scrollTo mid-load.
      window.scrollTo({ top: 0, left: 0, behavior: scrollBehavior() })
      return
    }
    // sessionStorage can throw (Safari private browsing, storage
    // partitioning) -- fails back to "no saved position" rather than crashing.
    let raw: string | null = null
    try {
      raw = sessionStorage.getItem(STORAGE_PREFIX + location.key)
    } catch {
      raw = null
    }
    const target = raw !== null ? Number(raw) : 0
    let attempts = 0
    let cancelled = false
    let frame = 0

    function tryRestore() {
      if (cancelled) return
      attempts++
      window.scrollTo(0, target)
      const closeEnough = Math.abs(window.scrollY - target) < 4
      const tallEnough = document.documentElement.scrollHeight - window.innerHeight >= target - 4
      if (!closeEnough && !tallEnough && attempts < RESTORE_ATTEMPTS) {
        frame = requestAnimationFrame(tryRestore)
      }
    }
    tryRestore()

    return () => {
      cancelled = true
      if (frame) cancelAnimationFrame(frame)
    }
  }, [location.pathname, location.key, navType])

  useEffect(() => {
    // rAF-throttled: writes at most once per frame, not per scroll event.
    let ticking = false
    function saveScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        try {
          sessionStorage.setItem(STORAGE_PREFIX + location.key, String(window.scrollY))
        } catch {
          // Position just won't be restored on back/forward -- not worth surfacing.
        }
        ticking = false
      })
    }
    window.addEventListener('scroll', saveScroll, { passive: true })
    return () => window.removeEventListener('scroll', saveScroll)
  }, [location.key])
}

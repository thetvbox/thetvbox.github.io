import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { scrollBehavior } from '../lib/motion'

const STORAGE_PREFIX = 'scrollpos:'
const RESTORE_ATTEMPTS = 60

/** Restores scroll position on back/forward navigation, resets to top otherwise. */
export function useScrollRestoration() {
  const location = useLocation()
  const navType = useNavigationType()

  useEffect(() => {
    if (navType !== 'POP') {
      window.scrollTo({ top: 0, left: 0, behavior: scrollBehavior() })
      return
    }
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
    let ticking = false
    function saveScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        try {
          sessionStorage.setItem(STORAGE_PREFIX + location.key, String(window.scrollY))
        } catch {}
        ticking = false
      })
    }
    window.addEventListener('scroll', saveScroll, { passive: true })
    return () => window.removeEventListener('scroll', saveScroll)
  }, [location.key])
}

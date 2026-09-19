import { useEffect } from 'react'

/** True when the Badging API (navigator.setAppBadge/clearAppBadge) is available. */
function hasBadgeSupport(nav: Navigator): boolean {
  return typeof nav.setAppBadge === 'function' && typeof nav.clearAppBadge === 'function'
}

/** Reflects `count` on the home-screen app icon via the Badging API, clearing it on unmount; a safe no-op where unsupported. */
export function useAppBadge(count: number) {
  useEffect(() => {
    if (!hasBadgeSupport(navigator)) return
    try {
      const result = count > 0 ? navigator.setAppBadge(count) : navigator.clearAppBadge()
      result.catch(() => {})
    } catch {}
  }, [count])

  useEffect(() => {
    return () => {
      if (!hasBadgeSupport(navigator)) return
      try {
        navigator.clearAppBadge().catch(() => {})
      } catch {}
    }
  }, [])
}

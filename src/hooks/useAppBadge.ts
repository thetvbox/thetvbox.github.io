import { useEffect } from 'react'

/** True when the Badging API (navigator.setAppBadge/clearAppBadge) is available. */
function hasBadgeSupport(nav: Navigator): boolean {
  return typeof nav.setAppBadge === 'function' && typeof nav.clearAppBadge === 'function'
}

/**
 * Reflects `count` on the home-screen app icon via the Badging API, when
 * supported. Clears the badge when the count drops to zero and again on
 * unmount, and is a safe no-op everywhere the API doesn't exist.
 */
export function useAppBadge(count: number) {
  useEffect(() => {
    if (!hasBadgeSupport(navigator)) return
    try {
      const result = count > 0 ? navigator.setAppBadge(count) : navigator.clearAppBadge()
      result.catch(() => {})
    } catch {
      // Best-effort only.
    }
  }, [count])

  useEffect(() => {
    return () => {
      if (!hasBadgeSupport(navigator)) return
      try {
        navigator.clearAppBadge().catch(() => {})
      } catch {
        // Best-effort only.
      }
    }
  }, [])
}

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Closes an always-mounted top-bar dropdown on route change -- Navbar never
 * unmounts between pages, so nothing else would close it. */
export function useCloseOnNavigate(onClose: () => void) {
  const location = useLocation()
  useEffect(() => {
    onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pathname only, onClose is a fresh closure every render
  }, [location.pathname])
}
